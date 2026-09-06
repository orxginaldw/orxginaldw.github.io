import { json } from "./util.js";
import { authMe } from "./auth.js";

async function getUser(id) {
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

async function getCache(env, id) {
    const rows = await env.DB.prepare("SELECT users FROM users WHERE IFNULL(users, '') NOT IN ('', '[]')").all();
    for (const row of rows.results || []) {
        for (const user of JSON.parse(row.users)) {
            if (String(user.id) === id && user.thumbnail) {
                return {
                    id,
                    username: user.username || id,
                    thumbnail: user.thumbnail,
                };
            }
        }
    }
    return null;
}

export async function addUser(request, env) {
    await authMe(request, env);
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const cached = await getCache(env, id);
    const fresh = cached || (await getUser(id));
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

export async function removeUser(request, env) {
    const me = await (await authMe(request, env)).json();
    const { userId } = await request.json();
    const id = String(userId || "").trim();
    const users = me.users.filter((user) => String(user.id) !== id);
    await env.DB.prepare("UPDATE users SET users = ? WHERE id = ?")
        .bind(JSON.stringify(users), me.id)
        .run();
    return json({ ok: true, users });
}

export async function saveSettings(request, env) {
    const me = await (await authMe(request, env)).json();
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
    for (const user of me.users) existing[String(user.id)] = user;
    const users = [];
    for (const item of body.users.slice(0, 10)) {
        const id = String(item.id || "").trim();
        if (!id) continue;
        const previous = existing[id];
        let username = item.username || (previous && previous.username) || "";
        let thumbnail = item.thumbnail || (previous && previous.thumbnail) || "";
        let refreshed = Number(item.refreshed) || Number(previous && previous.refreshed) || now;
        if (!username || !thumbnail) {
            const fresh = (await getCache(env, id)) || (await getUser(id));
            if (!fresh) continue;
            username = fresh.username;
            thumbnail = fresh.thumbnail;
            refreshed = now;
        }
        users.push({
            id,
            username,
            thumbnail,
            added: Number(item.added) || Number(previous && previous.added) || now,
            refreshed,
        });
    }
    await env.DB.prepare("UPDATE users SET webhook = ?, users = ? WHERE id = ?")
        .bind(webhook, JSON.stringify(users), me.id)
        .run();
    return json({ ok: true, webhook, users });
}

export async function generateKey(request, env) {
    const response = await authMe(request, env);
    if (!response.ok) return response;
    const me = await response.json();
    if (!me.premium) return json({ error: "Premium" }, 403);
    const key = [...crypto.getRandomValues(new Uint8Array(40))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await env.DB.prepare("UPDATE users SET key = ? WHERE id = ?").bind(key, me.id).run();
    return json({ key });
}
