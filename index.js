import { find } from "./serverfinder.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function count(request, env) {
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

async function search(request, env) {
    const { userId } = await request.json();
    return json(await find(userId, env));
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const publicRoutes = {
            "/api/counts": count,
        };
        const privateRoutes = {
            "/api/track": track,
            "/api/find": search,
        };
        const publicHandler = publicRoutes[path];
        if (publicHandler) {
            return publicHandler(request, env);
        }
        const privateHandler = privateRoutes[path];
        if (privateHandler) {
            if (request.headers.get("x-api-token") !== env.API_TOKEN) {
                return json({ error: "unauthorized" }, 401);
            }
            return privateHandler(request, env);
        }

        return env.ASSETS.fetch(request);
    },
};
