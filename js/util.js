export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

export function cookie(request, name) {
    for (const part of (request.headers.get("Cookie") || "").split(";")) {
        const [key, ...rest] = part.trim().split("=");
        if (key === name) return decodeURIComponent(rest.join("="));
    }
    return null;
}

export async function ensureUsers(env) {
    await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, bought_at TEXT, ip TEXT, ip_at TEXT, stripe_customer TEXT, stripe_subscription TEXT)",
    ).run();
}
