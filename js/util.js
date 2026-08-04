export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

export function cookie(request, name) {
    const raw = request.headers.get("Cookie") || "";
    const match = raw.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
}

export async function ensureUsers(env) {
    await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, bought_at TEXT, ip TEXT, ip_at TEXT, stripe_customer TEXT, stripe_subscription TEXT)",
    ).run();
}
