import { ApplicationContextUserAction, Client, Environment, ExperienceContextShippingPreference, SubscriptionsController } from "@paypal/paypal-server-sdk";
import { json, cookie, ensureUsers } from "./util.js";
import { discordUser } from "./discord.js";

function paypalClient(env) {
    return new Client({
        clientCredentialsAuthCredentials: {
            oAuthClientId: env.PAYPAL_ID,
            oAuthClientSecret: env.PAYPAL_SECRET,
        },
        environment: Environment.Production,
    });
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

export async function paypalCheckout(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const subscriptions = new SubscriptionsController(paypalClient(env));
    const response = await subscriptions.createSubscription({
        prefer: "return=representation",
        body: {
            planId: env.PAYPAL_PLAN,
            customId: user.id,
            applicationContext: {
                brandName: "Binwoken",
                returnUrl: "https://binwoken.sh/?premium=1",
                cancelUrl: "https://binwoken.sh/",
                shippingPreference: ExperienceContextShippingPreference.NoShipping,
                userAction: ApplicationContextUserAction.SubscribeNow,
            },
        },
    });
    const sub = response.result;
    let url = "";
    for (const link of sub.links) {
        if (link.rel === "approve") url = link.href;
    }
    return json({ url });
}

export async function paypalPortal(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT customer FROM users WHERE id = ?").bind(user.id).first();
    if (!row || !row.customer) return json({ error: "Forbidden" }, 403);
    return json({ url: "https://www.paypal.com/myaccount/autopay" });
}

export async function paypalWebhook(request, env) {
    const raw = await request.text();
    const event = JSON.parse(raw);
    const client = paypalClient(env);
    const oauth = await client.clientCredentialsAuthManager.fetchToken();
    const verify = await fetch("https://api-m.paypal.com/v1/notifications/verify-webhook-signature", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + oauth.accessToken,
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
    if (type === "BILLING.SUBSCRIPTION.CANCELLED" || type === "BILLING.SUBSCRIPTION.EXPIRED" || type === "BILLING.SUBSCRIPTION.SUSPENDED") {
        await clearPremium(env, String(discordId));
    }
    if (type === "BILLING.SUBSCRIPTION.UPDATED") {
        if (resource.status === "ACTIVE") {
            await setPremium(env, String(discordId), null, {
                customer: payer,
                subscription: resource.id,
            });
        } else if (resource.status === "CANCELLED" || resource.status === "EXPIRED" || resource.status === "SUSPENDED") {
            await clearPremium(env, String(discordId));
        }
    }
    return json({ ok: true });
}
