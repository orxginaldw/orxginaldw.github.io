import { json, cookie } from "./util.js";
import { discordUser } from "./discord.js";

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
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT purchased, access, customer FROM users WHERE id = ?").bind(user.id).first();
    return json({
        premium: row ? 1 : 0,
        purchased: row && row.purchased ? row.purchased : null,
        access: row && row.access ? 1 : 0,
    });
}

export function authIp(request) {
    return json({ ip: request.headers.get("CF-Connecting-IP") || "" });
}
