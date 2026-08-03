function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

const CLIENT_ID = "1514413081365708800";
const REDIRECT_URI = "https://binwoken.sh/auth";

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

function cookie(request, name) {
    const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

async function authLogin() {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: "code",
        scope: "identify",
        redirect_uri: REDIRECT_URI,
    });
    return Response.redirect(`https://discord.com/oauth2/authorize?${params}`, 302);
}

async function authCallback(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: env.DISCORD_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });
    const token = await tokenRes.json();
    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = await userRes.json();
    await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, premium INTEGER NOT NULL DEFAULT 0, bought_at TEXT)",
    ).run();
    await env.DB.prepare(
        "INSERT INTO users (id, username, premium, bought_at) VALUES (?, ?, 0, NULL) ON CONFLICT(id) DO UPDATE SET username = excluded.username",
    )
        .bind(user.id, user.username)
        .run();
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie": `session=${encodeURIComponent(user.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
    });
}

async function authMe(request, env) {
    const id = cookie(request, "session");
    const row = await env.DB.prepare(
        "SELECT id, username, premium, bought_at FROM users WHERE id = ?",
    )
        .bind(id)
        .first();
    return json(row);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === "/auth/login") return authLogin();
        if (path === "/auth") return authCallback(request, env);
        if (path === "/auth/me") return authMe(request, env);
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
