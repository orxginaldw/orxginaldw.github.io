import Stripe from "stripe";
import { json, cookie, ensureUsers } from "./util.js";
import { discordUser } from "./discord.js";

function stripeClient(env) {
    return new Stripe(env.STRIPE_SECRET, {
        httpClient: Stripe.createFetchHttpClient(),
    });
}

async function setPremium(env, discordId, username, extra = {}) {
    await ensureUsers(env);
    const bought = new Date().toISOString();
    await env.DB.prepare(
        "INSERT INTO users (id, username, bought_at, stripe_customer, stripe_subscription) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET username = excluded.username, bought_at = COALESCE(users.bought_at, excluded.bought_at), stripe_customer = COALESCE(excluded.stripe_customer, users.stripe_customer), stripe_subscription = COALESCE(excluded.stripe_subscription, users.stripe_subscription)",
    )
        .bind(discordId, username || discordId, bought, extra.customer || null, extra.subscription || null)
        .run();
}

async function clearPremium(env, discordId) {
    await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(discordId).run();
}

export async function stripeCheckout(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "login" }, 401);
    const stripe = stripeClient(env);
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: "https://binwoken.sh/?premium=1",
        cancel_url: "https://binwoken.sh/",
        line_items: [{ price: env.STRIPE_ID, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: user.id,
        metadata: { discord_id: user.id, discord_username: user.username },
        subscription_data: { metadata: { discord_id: user.id } },
    });
    return json({ url: session.url });
}

export async function stripePortal(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "login" }, 401);
    const row = await env.DB.prepare("SELECT stripe_customer FROM users WHERE id = ?").bind(user.id).first();
    if (!row || !row.stripe_customer) return json({ error: "no customer" }, 400);
    const stripe = stripeClient(env);
    const session = await stripe.billingPortal.sessions.create({
        customer: row.stripe_customer,
        return_url: "https://binwoken.sh/",
    });
    return json({ url: session.url });
}

export async function stripeWebhook(request, env) {
    const raw = await request.text();
    const stripe = stripeClient(env);
    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(
            raw,
            request.headers.get("stripe-signature"),
            env.STRIPE_WEBHOOK,
            undefined,
            Stripe.createSubtleCryptoProvider(),
        );
    } catch {
        return json({ error: "bad sig" }, 400);
    }
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const discordId = session.metadata?.discord_id || session.client_reference_id;
        if (discordId) {
            await setPremium(env, String(discordId), session.metadata?.discord_username, {
                customer: session.customer,
                subscription: session.subscription,
            });
        }
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
        const sub = event.data.object;
        const discordId = sub.metadata?.discord_id;
        if (discordId) {
            const active = event.type !== "customer.subscription.deleted" && (sub.status === "active" || sub.status === "trialing");
            if (active) {
                await setPremium(env, String(discordId), null, {
                    customer: sub.customer,
                    subscription: sub.id,
                });
            } else {
                await clearPremium(env, String(discordId));
            }
        }
    }
    return json({ ok: true });
}
