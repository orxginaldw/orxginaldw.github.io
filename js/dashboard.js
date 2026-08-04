import { json, cookie } from "./util.js";
import { discordUser } from "./discord.js";

export async function dashboardWatch(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const row = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(user.id).first();
    if (!row) return json({ error: "Premium" }, 403);
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const [infoRes, thumbRes] = await Promise.all([
        fetch("https://users.roblox.com/v1/users/" + id),
        fetch(
            "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
                encodeURIComponent(id) +
                "&size=150x150&format=Png&isCircular=false",
        ),
    ]);
    const info = await infoRes.json();
    const thumb = await thumbRes.json();
    return json({
        id: String(info.id),
        username: info.name,
        thumbnail: thumb.data[0].imageUrl,
    });
}
