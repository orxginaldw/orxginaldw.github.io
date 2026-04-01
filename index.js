function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        let path = url.pathname;
        while (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
        if (!path) path = "/";

        if (path === "/api/counts" && request.method === "GET") {
            if (!env.DB) return json({ error: "db" }, 503);
            const { results } = await env.DB.prepare(
                "SELECT id, count FROM downloads",
            ).all();
            const out = {};
            for (const row of results) out[row.id] = row.count;
            return json(out);
        }

        if (path === "/api/track" && request.method === "POST") {
            if (!env.DB) return json({ error: "db" }, 503);
            let body = {};
            try {
                body = await request.json();
            } catch {
                return json({ error: "json" }, 400);
            }
            const id =
                typeof body.id === "string" ? body.id.slice(0, 128) : "";
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

        return env.ASSETS.fetch(request);
    },
};
