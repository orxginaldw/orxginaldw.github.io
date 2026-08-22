import { json } from "./js/util.js";
import { authLogin, authPage, authMe, authIp } from "./js/auth.js";
import { stripeCheckout, stripePortal, stripeWebhook } from "./js/stripe.js";
import { addUser, saveSettings, removeUser, generateKey } from "./js/dashboard.js";

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

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === "/auth/login") return authLogin();
        if (path === "/auth" && request.method === "GET") return authPage();
        if (path === "/auth/me" && request.method === "POST") return authMe(request, env);
        if (path === "/auth/ip" && request.method === "GET") return authIp(request);
        if (path === "/stripe/checkout" && request.method === "POST") return stripeCheckout(request, env);
        if (path === "/stripe/portal" && request.method === "POST") return stripePortal(request, env);
        if (path === "/stripe/webhook" && request.method === "POST") return stripeWebhook(request, env);
        if (path === "/settings/add" && request.method === "POST") return addUser(request, env);
        if (path === "/settings/remove" && request.method === "POST") return removeUser(request, env);
        if (path === "/settings" && request.method === "POST") return saveSettings(request, env);
        if (path === "/settings/key" && request.method === "POST") return generateKey(request, env);
        const routes = {
            "/public/counts": count,
            "/public/track": track,
        };
        const handler = routes[path];
        if (handler) return handler(request, env);
        const legal = {
            "/privacy": "/privacy.html",
            "/privacy/": "/privacy.html",
            "/refund": "/refund.html",
            "/refund/": "/refund.html",
            "/terms": "/terms.html",
            "/terms/": "/terms.html",
        };
        if (legal[path]) return env.ASSETS.fetch(new URL(legal[path], url.origin));
        return env.ASSETS.fetch(request);
    },
};
