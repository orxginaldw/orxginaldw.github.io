import { json, cookie, ensureUsers } from "./util.js";
import { discordUser } from "./discord.js";

async function premiumUser(request, env) {
    const token = cookie(request, "discord_token");
    const user = token ? await discordUser(token) : null;
    if (!user) return { error: json({ error: "Unauthorized" }, 401) };
    await ensureUsers(env);
    const row = await env.DB.prepare("SELECT id, webhook, watches FROM users WHERE id = ?").bind(user.id).first();
    if (!row) return { error: json({ error: "Premium" }, 403) };
    return { user, row };
}

async function robloxUser(id) {
    const [infoRes, thumbRes] = await Promise.all([
        fetch("https://users.roblox.com/v1/users/" + id),
        fetch(
            "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
                encodeURIComponent(id) +
                "&size=150x150&format=Png&isCircular=false",
        ),
    ]);
    if (!infoRes.ok) return null;
    const info = await infoRes.json();
    const thumb = await thumbRes.json();
    return {
        id: String(info.id),
        username: info.name,
        thumbnail: thumb.data[0].imageUrl,
    };
}

function parseWatches(raw) {
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.slice(0, 10) : [];
}

async function cachedWatch(env, id) {
    const rows = await env.DB.prepare("SELECT watches FROM users WHERE IFNULL(watches, '') NOT IN ('', '[]')").all();
    for (const row of rows.results || []) {
        for (const watch of parseWatches(row.watches)) {
            if (String(watch.id) === id && watch.thumbnail) {
                return {
                    id,
                    username: watch.username || id,
                    thumbnail: watch.thumbnail,
                };
            }
        }
    }
    return null;
}

export async function dashboardWatch(request, env) {
    const gate = await premiumUser(request, env);
    if (gate.error) return gate.error;
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const cached = await cachedWatch(env, id);
    const fresh = cached || (await robloxUser(id));
    if (!fresh) return json({ error: "Invalid" }, 404);
    const now = Math.floor(Date.now() / 1000);
    return json({
        id: fresh.id,
        username: fresh.username,
        thumbnail: fresh.thumbnail,
        added: now,
        refreshed: now,
    });
}

export async function dashboardGet(request, env) {
    const gate = await premiumUser(request, env);
    if (gate.error) return gate.error;
    return json({
        webhook: gate.row.webhook || "",
        watches: parseWatches(gate.row.watches),
    });
}

export async function dashboardRemove(request, env) {
    const gate = await premiumUser(request, env);
    if (gate.error) return gate.error;
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const watches = parseWatches(gate.row.watches).filter((watch) => String(watch.id) !== id);
    await env.DB.prepare("UPDATE users SET watches = ? WHERE id = ?")
        .bind(JSON.stringify(watches), gate.user.id)
        .run();
    return json({ ok: true, watches });
}

export async function dashboardSave(request, env) {
    const gate = await premiumUser(request, env);
    if (gate.error) return gate.error;
    const body = await request.json();
    const captcha = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            secret: env.RECAPTCHA_SECRET,
            response: String(body.token || ""),
        }),
    });
    if ((await captcha.json()).success !== true) return json({ error: "Recaptcha" }, 403);
    const webhook = String(body.webhook || "").trim();
    const now = Math.floor(Date.now() / 1000);
    const existing = {};
    for (const watch of parseWatches(gate.row.watches)) existing[String(watch.id)] = watch;
    const watches = [];
    for (const item of (Array.isArray(body.watches) ? body.watches : []).slice(0, 10)) {
        const id = String(item.id || "").trim();
        if (!id) continue;
        const prev = existing[id];
        let username = item.username || (prev && prev.username) || "";
        let thumbnail = item.thumbnail || (prev && prev.thumbnail) || "";
        let refreshed = Number(item.refreshed) || Number(prev && prev.refreshed) || now;
        if (!username || !thumbnail) {
            const fresh = (await cachedWatch(env, id)) || (await robloxUser(id));
            if (!fresh) continue;
            username = fresh.username;
            thumbnail = fresh.thumbnail;
            refreshed = now;
        }
        watches.push({
            id,
            username,
            thumbnail,
            added: Number(item.added) || Number(prev && prev.added) || now,
            refreshed,
        });
    }
    await env.DB.prepare("UPDATE users SET webhook = ?, watches = ? WHERE id = ?")
        .bind(webhook, JSON.stringify(watches), gate.user.id)
        .run();
    return json({ ok: true, webhook, watches });
}
