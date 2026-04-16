import { find, run } from "./serverfinder.js";

const SERVERFINDER_COUNT_ID = "serverfinder_searches";

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function recaptcha(token, env) {
    return (
        await (
            await fetch("https://www.google.com/recaptcha/api/siteverify", {
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    secret: env.RECAPTCHA_SECRET,
                    response: token,
                }),
            })
        ).json()
    ).success === true;
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

async function search(request, env) {
    const { userId, token } = await request.json();
    if (!(await recaptcha(token, env))) {
        return json({ error: "recaptcha" }, 403);
    }
    const result = await find(userId, env);
    if (result && result.code === 0) {
        await env.DB.prepare(
            "INSERT INTO downloads (id, count) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET count = count + 1",
        )
            .bind(SERVERFINDER_COUNT_ID)
            .run();
        const row = await env.DB.prepare(
            "SELECT count FROM downloads WHERE id = ?",
        )
            .bind(SERVERFINDER_COUNT_ID)
            .first();
        result.searchCount = row?.count ?? 0;
    }
    return json(result);
}

async function runFinder(_request, env) {
    try {
        await run(env);
        return json({ ok: true });
    } catch (e) {
        return json({ error: String(e?.message ?? e) }, 500);
    }
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
            "/api/counts": count,
            "/api/track": track,
            "/api/find": search,
            "/api/serverfinder/run": runFinder,
            "/public/api/chime.json": chime,
        };
        const handler = routes[path];
        if (handler) {
            return handler(request, env);
        }

        return env.ASSETS.fetch(request);
    },
    async scheduled(_event, env) {
        try {
            await run(env);
        } catch {}
    },
};
