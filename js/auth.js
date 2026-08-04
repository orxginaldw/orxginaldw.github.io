import { json } from "./util.js";

export async function authLogin() {
    const params = new URLSearchParams({
        client_id: "1514413081365708800",
        response_type: "token",
        scope: "identify",
        redirect_uri: "https://binwoken.sh/auth",
    });
    return Response.redirect(`https://discord.com/oauth2/authorize?${params}`, 302);
}

export function authPage() {
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>Logging in…</title></head><body><script>
(async () => {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("access_token");
  if (!token) { location.replace("/"); return; }
  document.cookie = "discord_token=" + encodeURIComponent(token) + "; Path=/; Secure; SameSite=Lax; Max-Age=604800";
  location.replace("/");
})();
</script></body></html>`, {
        headers: { "content-type": "text/html; charset=utf-8" },
    });
}

export async function authMe(request, env) {
    const body = await request.json();
    const id = String(body.id);
    const row = await env.DB.prepare("SELECT bought_at FROM users WHERE id = ?").bind(id).first();
    return json({ premium: row ? 1 : 0, bought_at: row && row.bought_at ? row.bought_at : null });
}

export function authIp(request) {
    return json({ ip: request.headers.get("CF-Connecting-IP") || "" });
}
