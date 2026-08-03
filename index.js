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

async function authSave(request, env) {
    const body = await request.json();
    const id = String(body.id);
    const username = String(body.username);
    await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, premium INTEGER NOT NULL DEFAULT 0, bought_at TEXT)",
    ).run();
    await env.DB.prepare(
        "INSERT INTO users (id, username, premium, bought_at) VALUES (?, ?, 0, NULL) ON CONFLICT(id) DO UPDATE SET username = excluded.username",
    )
        .bind(id, username)
        .run();
    return json({ ok: true });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;
        if (path === "/auth/login") return authLogin();
        if (path === "/auth" && request.method === "GET") return authPage();
        if (path === "/auth/save" && request.method === "POST") return authSave(request, env);
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
