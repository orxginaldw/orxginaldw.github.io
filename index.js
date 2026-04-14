import { find } from "./serverfinder.js";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function recaptcha(token, env) {
    const secret = env.RECAPTCHA_SECRET;
    const response = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
        },
    );
    const result = await response.json();
    return result.success === true;
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
    const { userId, token } = await request.json();
    if (!(await recaptcha(token, env))) {
        return json({ error: "captcha" }, 403);
    }
    return json(await find(userId, env));
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const routes = {
            "/api/counts": count,
            "/api/track": track,
            "/api/find": search,
        };
        const handler = routes[path];
        if (handler) {
            return handler(request, env);
        }

        return env.ASSETS.fetch(request);
    },
};
