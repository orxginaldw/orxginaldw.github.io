import { find } from "./serverfinder.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function counts(request, env) {
    if (request.method !== "GET") return json({ error: "method" }, 405);
    const { results } = await env.DB.prepare(
        "SELECT id, count FROM downloads",
    ).all();
    const out = {};
    for (const row of results) out[row.id] = row.count;
    return json(out);
}

async function track(request, env) {
    if (request.method !== "POST") return json({ error: "method" }, 405);
    let body = {};
    try {
        body = await request.json();
    } catch {
        return json({ error: "json" }, 400);
    }
    const id = typeof body.id === "string" ? body.id.slice(0, 128) : "";
    if (!id) return json({ error: "id" }, 400);
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

async function search(request, env) {
    if (request.method !== "POST") return json({ error: "method" }, 405);
    let body = {};
    try {
        body = await request.json();
    } catch {
        return json({ error: "json" }, 400);
    }
    const userId =
        typeof body.userId === "string" || typeof body.userId === "number"
            ? String(body.userId).trim()
            : "";
    if (!/^[0-9]+$/.test(userId)) return json({ error: "userId" }, 400);
    return json(await find(userId, env));
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, "") || "/";
        const routes = {
            "/api/counts": counts,
            "/api/track": track,
            "/api/find": search,
        };
        const handler = routes[path];
        if (handler) {
            if (!env.DB) return json({ error: "db" }, 503);
            return handler(request, env);
        }

        return env.ASSETS.fetch(request);
    },
};
