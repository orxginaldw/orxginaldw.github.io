import { json, cookie, ensureUsers } from "./util.js";
import { discordUser } from "./discord.js";

async function paypalToken(env) {
    const res = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
        method: "POST",
        headers: {
            Authorization: "Basic " + btoa(env.PAYPAL_ID + ":" + env.PAYPAL_SECRET),
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    });
    const data = await res.json();
    return data.access_token;
}

export async function paypalSubscription(env, id) {
    const access = await paypalToken(env);
    const res = await fetch("https://api-m.paypal.com/v1/billing/subscriptions/" + id, {
        headers: { Authorization: "Bearer " + access },
    });
    return res.json();
}

async function setPremium(env, discordId, username, extra = {}) {
    await ensureUsers(env);
    const purchased = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
        "INSERT INTO users (id, username, purchased, customer, subscription) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, purchased = COALESCE(users.purchased, excluded.purchased), customer = COALESCE(excluded.customer, users.customer), subscription = COALESCE(excluded.subscription, users.subscription)",
    )
        .bind(discordId, username || discordId, purchased, extra.customer || null, extra.subscription || null)
        .run();
}

async function clearPremium(env, discordId) {
    await env.DB.prepare(
        "UPDATE users SET purchased = NULL, customer = NULL, subscription = NULL WHERE id = ? AND IFNULL(access, 0) = 0",
    )
        .bind(discordId)
        .run();
}

async function pausePremium(env, discordId) {
    await env.DB.prepare(
        "UPDATE users SET purchased = NULL WHERE id = ? AND IFNULL(access, 0) = 0",
    )
        .bind(discordId)
        .run();
}

export async function paypalCheckout(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const access = await paypalToken(env);
    const res = await fetch("https://api-m.paypal.com/v1/billing/subscriptions", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + access,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            plan_id: "P-13Y246981T925843WNKOKXWA",
            custom_id: user.id,
            application_context: {
                brand_name: "Binwoken",
                return_url: "https://binwoken.sh/?premium=1",
                cancel_url: "https://binwoken.sh/",
                shipping_preference: "NO_SHIPPING",
                user_action: "SUBSCRIBE_NOW",
            },
        }),
    });
    const sub = await res.json();
    let url = "";
    for (const link of sub.links) {
        if (link.rel === "approve") url = link.href;
    }
    return json({ url });
}

export async function paypalCancel(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT subscription FROM users WHERE id = ?").bind(user.id).first();
    if (!row || !row.subscription) return json({ error: "Forbidden" }, 403);
    const access = await paypalToken(env);
    await fetch("https://api-m.paypal.com/v1/billing/subscriptions/" + row.subscription + "/suspend", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + access,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Customer-requested pause" }),
    });
    await pausePremium(env, user.id);
    return json({ ok: true });
}

export async function paypalResume(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT subscription FROM users WHERE id = ?").bind(user.id).first();
    if (!row || !row.subscription) return json({ error: "Forbidden" }, 403);
    const sub = await paypalSubscription(env, row.subscription);
    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") {
        await clearPremium(env, user.id);
        return paypalCheckout(request, env);
    }
    const access = await paypalToken(env);
    const owed = sub.billing_info && sub.billing_info.outstanding_balance ? Number(sub.billing_info.outstanding_balance.value) : 0;
    if (owed > 0) {
        await fetch("https://api-m.paypal.com/v1/billing/subscriptions/" + row.subscription + "/capture", {
            method: "POST",
            headers: {
                Authorization: "Bearer " + access,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                note: "Outstanding balance",
                capture_type: "OUTSTANDING_BALANCE",
                amount: sub.billing_info.outstanding_balance,
            }),
        });
    }
    await fetch("https://api-m.paypal.com/v1/billing/subscriptions/" + row.subscription + "/activate", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + access,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Reactivating on customer request" }),
    });
    await setPremium(env, user.id, user.username, {
        customer: sub.subscriber ? sub.subscriber.payer_id : null,
        subscription: row.subscription,
    });
    return json({ ok: true });
}

export async function paypalWebhook(request, env) {
    const raw = await request.text();
    const event = JSON.parse(raw);
    const access = await paypalToken(env);
    const verify = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + access,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            auth_algo: request.headers.get("paypal-auth-algo"),
            cert_url: request.headers.get("paypal-cert-url"),
            transmission_id: request.headers.get("paypal-transmission-id"),
            transmission_sig: request.headers.get("paypal-transmission-sig"),
            transmission_time: request.headers.get("paypal-transmission-time"),
            webhook_id: env.PAYPAL_WEBHOOK,
            webhook_event: event,
        }),
    });
    const check = await verify.json();
    if (check.verification_status !== "SUCCESS") return json({ error: "Bad Signature" }, 400);
    const resource = event.resource;
    const discordId = resource.custom_id;
    if (!discordId) return json({ ok: true });
    const payer = resource.subscriber ? resource.subscriber.payer_id : null;
    const type = event.event_type;
    if (type === "BILLING.SUBSCRIPTION.ACTIVATED" || type === "BILLING.SUBSCRIPTION.RE-ACTIVATED") {
        await setPremium(env, String(discordId), null, {
            customer: payer,
            subscription: resource.id,
        });
    }
    if (type === "BILLING.SUBSCRIPTION.SUSPENDED") {
        await pausePremium(env, String(discordId));
    }
    if (type === "BILLING.SUBSCRIPTION.CANCELLED" || type === "BILLING.SUBSCRIPTION.EXPIRED") {
        await clearPremium(env, String(discordId));
    }
    if (type === "BILLING.SUBSCRIPTION.UPDATED") {
        if (resource.status === "ACTIVE") {
            await setPremium(env, String(discordId), null, {
                customer: payer,
                subscription: resource.id,
            });
        } else if (resource.status === "SUSPENDED") {
            await pausePremium(env, String(discordId));
        } else if (resource.status === "CANCELLED" || resource.status === "EXPIRED") {
            await clearPremium(env, String(discordId));
        }
    }
    return json({ ok: true });
}
