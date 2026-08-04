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

async function refreshWatches(watches) {
    const now = Math.floor(Date.now() / 1000);
    let changed = false;
    const out = [];
    for (const watch of watches) {
        const id = String(watch.id || "").trim();
        if (!id) continue;
        const refreshed = Number(watch.refreshed) || 0;
        if (now - refreshed < 3600 && watch.username && watch.thumbnail) {
            out.push({
                id,
                username: watch.username,
                thumbnail: watch.thumbnail,
                added: Number(watch.added) || refreshed || now,
                refreshed,
            });
            continue;
        }
        const fresh = await robloxUser(id);
        if (!fresh) continue;
        changed = true;
        out.push({
            id: fresh.id,
            username: fresh.username,
            thumbnail: fresh.thumbnail,
            added: Number(watch.added) || now,
            refreshed: now,
        });
    }
    return { watches: out, changed };
}

export async function dashboardWatch(request, env) {
    const gate = await premiumUser(request, env);
    if (gate.error) return gate.error;
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const fresh = await robloxUser(id);
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
    const { watches, changed } = await refreshWatches(parseWatches(gate.row.watches));
    if (changed) {
        await env.DB.prepare("UPDATE users SET watches = ? WHERE id = ?")
            .bind(JSON.stringify(watches), gate.user.id)
            .run();
    }
    return json({
        webhook: gate.row.webhook || "",
        watches,
    });
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
        const refreshed = Number(item.refreshed) || Number(prev && prev.refreshed) || 0;
        let username = item.username || (prev && prev.username) || "";
        let thumbnail = item.thumbnail || (prev && prev.thumbnail) || "";
        let nextRefreshed = refreshed;
        if (!username || !thumbnail || now - refreshed >= 3600) {
            const fresh = await robloxUser(id);
            if (!fresh) continue;
            username = fresh.username;
            thumbnail = fresh.thumbnail;
            nextRefreshed = now;
        }
        watches.push({
            id,
            username,
            thumbnail,
            added: Number(item.added) || Number(prev && prev.added) || now,
            refreshed: nextRefreshed,
        });
    }
    await env.DB.prepare("UPDATE users SET webhook = ?, watches = ? WHERE id = ?")
        .bind(webhook, JSON.stringify(watches), gate.user.id)
        .run();
    return json({ ok: true, webhook, watches });
}
