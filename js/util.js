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
        "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL, purchased INTEGER, ip TEXT, captured INTEGER, customer TEXT, subscription TEXT, access INTEGER)",
    ).run();
}
