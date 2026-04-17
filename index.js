function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

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

async function chime(_request, env) {
    const obj = await env.CHIME_MATCHES.get("chime.json");
    return new Response(obj?.body, {
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        const routes = {
            "/public/counts": count,
            "/public/track": track,
            "/public/chime.json": chime,
        };
        const handler = routes[path];
        if (handler) {
            return handler(request, env);
        }
        return env.ASSETS.fetch(request);
    },
};
