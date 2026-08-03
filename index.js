function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

const CLIENT_ID = "1514413081365708800";
const REDIRECT_URI = "https://binwoken.sh/auth";
const encoder = new TextEncoder();

async function count(_request, env) {
    const { results } = await env.DB.prepare(
        "SELECT id, count FROM downloads",
    ).all();
    const out = {};
    for (const row of results) out[row.id] = row.count;
    return json(out);
}

async function track(request, env) {
    const { id } = await request.json();
    await env.DB.prepare(
        "INSERT INTO downloads (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1",
    )
        .bind(id)
        .run();
    const row = await env.DB.prepare(
        "SELECT count FROM downloads WHERE id = ?",
    )
        .bind(id)
        .first();
    return json({ id, count: row.count });
}

async function authLogin() {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "token",
        scope: "identify",
        redirect_uri: REDIRECT_URI,
    });
    return Response.redirect(`https://discord.com/oauth2/authorize?${params}`, 302);
}

function authPage() {
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>Logging in…</title></head><body><script>
(async () => {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("access_token");
  if (!token) { location.replace("/"); return; }
  const user = await fetch("https://discord.com/api/users/@me", { headers: { Authorization: "Bearer " + token } }).then((r) => r.json());
  await fetch("/auth/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: user.id, username: user.username })
  });
  document.cookie = "discord_token=" + encodeURIComponent(token) + "; Path=/; Secure; SameSite=Lax; Max-Age=604800";
  location.replace("/");
})();
</script></body></html>`, {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}

async function ensureUsers(env) {
    await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, premium INTEGER NOT NULL DEFAULT 0, bought_at TEXT, ip TEXT, ip_at TEXT, stripe_customer TEXT, stripe_subscription TEXT)",
    ).run();
    await env.DB.prepare("ALTER TABLE users ADD COLUMN ip TEXT").run().catch(() => {});
    await env.DB.prepare("ALTER TABLE users ADD COLUMN ip_at TEXT").run().catch(() => {});
    await env.DB.prepare("ALTER TABLE users ADD COLUMN stripe_customer TEXT").run().catch(() => {});
    await env.DB.prepare("ALTER TABLE users ADD COLUMN stripe_subscription TEXT").run().catch(() => {});
}

async function authSave(request, env) {
    const body = await request.json();
    const id = String(body.id);
    const username = String(body.username);
    await ensureUsers(env);
    await env.DB.prepare(
        "INSERT INTO users (id, username, premium, bought_at) VALUES (?, ?, 0, NULL) ON CONFLICT(id) DO UPDATE SET username = excluded.username",
    )
        .bind(id, username)
        .run();
    return json({ ok: true });
}

async function authIp(request) {
    return json({ ip: request.headers.get("CF-Connecting-IP") || "" });
}

async function authMe(request, env) {
    const body = await request.json();
    const id = String(body.id);
    await ensureUsers(env);
    const row = await env.DB.prepare("SELECT premium, bought_at FROM users WHERE id = ?").bind(id).first();
    return json({ premium: row?.premium ? 1 : 0, bought_at: row?.bought_at || null });
}

function cookie(request, name) {
    const raw = request.headers.get("Cookie") || "";
    const match = raw.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
}

async function discordUser(token) {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + token },
    });
    if (!response.ok) return null;
    return response.json();
}

async function stripeCheckout(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "login" }, 401);
    await ensureUsers(env);
    const data = new URLSearchParams({
        mode: "subscription",
        success_url: "https://binwoken.sh/?premium=1",
        cancel_url: "https://binwoken.sh/",
        "line_items[0][price]": env.STRIPE_ID,
        "line_items[0][quantity]": "1",
        client_reference_id: user.id,
        "metadata[discord_id]": user.id,
        "subscription_data[metadata][discord_id]": user.id,
    });
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + env.STRIPE_SECRET,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
    });
    const session = await response.json();
    return json({ url: session.url });
}

function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return out;
}

async function verifyStripe(rawBody, header, secret) {
    const parts = Object.fromEntries(
        header.split(",").map((part) => {
            const [k, v] = part.split("=");
            return [k, v];
        }),
    );
    const t = parts.t;
    const v1 = header
        .split(",")
        .filter((part) => part.startsWith("v1="))
        .map((part) => part.slice(3));
    if (!t || !v1.length) return false;
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(t)) > 300) return false;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const payload = encoder.encode(t + "." + rawBody);
    for (const sig of v1) {
        if (await crypto.subtle.verify("HMAC", key, hexToBytes(sig), payload)) return true;
    }
    return false;
}

async function setPremium(env, discordId, premium, extra = {}) {
    await ensureUsers(env);
    const bought = premium ? new Date().toISOString() : null;
    const row = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(discordId).first();
    if (!row) {
        await env.DB.prepare(
            "INSERT INTO users (id, username, premium, bought_at, stripe_customer, stripe_subscription) VALUES (?, ?, ?, ?, ?, ?)",
        )
            .bind(discordId, discordId, premium ? 1 : 0, bought, extra.customer || null, extra.subscription || null)
            .run();
        return;
    }
    if (premium) {
        await env.DB.prepare(
            "UPDATE users SET premium = 1, bought_at = COALESCE(bought_at, ?), stripe_customer = COALESCE(?, stripe_customer), stripe_subscription = COALESCE(?, stripe_subscription) WHERE id = ?",
        )
            .bind(bought, extra.customer || null, extra.subscription || null, discordId)
            .run();
    } else {
        await env.DB.prepare(
            "UPDATE users SET premium = 0, stripe_subscription = NULL WHERE id = ?",
        )
            .bind(discordId)
            .run();
    }
}

async function stripeWebhook(request, env) {
    const raw = await request.text();
    const header = request.headers.get("stripe-signature") || "";
    if (!(await verifyStripe(raw, header, env.STRIPE_WEBHOOK))) {
        return json({ error: "bad sig" }, 400);
    }
    const event = JSON.parse(raw);
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const discordId = session.metadata?.discord_id || session.client_reference_id;
        if (discordId) {
            await setPremium(env, String(discordId), true, {
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
            await setPremium(env, String(discordId), active, {
                customer: sub.customer,
                subscription: active ? sub.id : null,
            });
        }
    }
    return json({ ok: true });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === "/auth/login") return authLogin();
        if (path === "/auth" && request.method === "GET") return authPage();
        if (path === "/auth/save" && request.method === "POST") return authSave(request, env);
        if (path === "/auth/me" && request.method === "POST") return authMe(request, env);
        if (path === "/auth/ip" && request.method === "GET") return authIp(request);
        if (path === "/stripe/checkout" && request.method === "POST") return stripeCheckout(request, env);
        if (path === "/stripe/webhook" && request.method === "POST") return stripeWebhook(request, env);
        const routes = {
            "/public/counts": count,
            "/public/track": track,
        };
        const handler = routes[path];
        if (handler) {
            return handler(request, env);
        }
        return env.ASSETS.fetch(request);
    },
};
