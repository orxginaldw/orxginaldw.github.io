const PLACE_IDS = ["6473861193", "5735553160", "6032399813"];

async function request(url, init) {
    for (let tries = 0; tries < 10; tries++) {
        try {
            const request = await globalThis.fetch(url, init);
            if (!request.ok) {
                throw new Error(String(request.status));
            }
            return await request.json();
        } catch (error) {
            if (tries === 9) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

async function get(placeId, cookie) {
    const out = new Map();
    let cursor = "";
    for (;;) {
        const url = cursor
            ? `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&cursor=${encodeURIComponent(cursor)}`
            : `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100`;
        const doc = await request(url, { headers: { Cookie: cookie } });
        for (const server of doc.data) {
            const jobId = server.id;
            let set = out.get(jobId);
            if (!set) {
                set = new Set();
                out.set(jobId, set);
            }
            for (const token of server.playerTokens) {
                set.add(token);
            }
        }
        cursor = doc.nextPageCursor || "";
        if (!cursor) break;
    }
    return out;
}

async function merge(placeId, cookies) {
    const merged = new Map();
    for (const cookie of cookies) {
        try {
            const part = await get(placeId, cookie);
            for (const [jobId, tokens] of part) {
                let set = merged.get(jobId);
                if (!set) {
                    set = new Set();
                    merged.set(jobId, set);
                }
                for (const token of tokens) {
                    set.add(token);
                }
            }
        } catch {}
    }
    return merged;
}

export async function run(env) {
    const list = [...JSON.parse(env.COOKIE_1), ...JSON.parse(env.COOKIE_2)];
    const now = Date.now();
    for (const placeId of PLACE_IDS) {
        try {
            const rows = await merge(placeId, list);
            if (rows.size === 0) {
                continue;
            }
            await env.DB.prepare(
                "DELETE FROM serverfinder WHERE place_id = ?",
            ).bind(placeId).run();
            for (const [jobId, tokens] of rows) {
                await env.DB.prepare(
                    "INSERT INTO serverfinder (place_id, job_id, player_tokens, date) VALUES (?, ?, ?, ?)",
                )
                    .bind(placeId, jobId, JSON.stringify([...tokens]), now)
                    .run();
            }
        } catch {}
    }
}

export async function find(userId, env) {
    const now = Date.now();
    const stamp = await env.DB.prepare(
        "SELECT MAX(date) AS date FROM serverfinder",
    ).first();
    const rows = await env.DB.prepare(
        "SELECT place_id, job_id, player_tokens FROM serverfinder",
    ).all();
    if (!stamp.date || now - stamp.date > 60_000) {
        run(env).catch(() => {});
    }

    const auth = JSON.parse(env.COOKIE_1)[0];
    const userid = String(userId).trim();
    const avatar = await request(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userid)}&size=150x150&format=Png&isCircular=false`,
        {},
    );
    const avatarUrl = avatar.data[0].imageUrl;

    const players = [];
    for (const row of rows.results) {
        for (const token of JSON.parse(row.player_tokens)) {
            players.push({
                token,
                jobId: row.job_id,
                placeId: row.place_id,
            });
        }
    }

    for (let index = 0; index < players.length; index += 100) {
        const chunk = players.slice(index, index + 100);
        const job = new Map(chunk.map((x) => [x.jobId, x]));
        const body = JSON.stringify(
            chunk.map(({ token, jobId }) => ({
                token,
                type: "AvatarHeadshot",
                size: "150x150",
                requestId: jobId,
            })),
        );
        const batch = await request("https://thumbnails.roblox.com/v1/batch", {
            method: "POST",
            headers: {
                Cookie: auth,
                "Content-Type": "application/json",
            },
            body,
        });
        for (const item of batch.data) {
            if (item.imageUrl !== avatarUrl) continue;
            const row = job.get(item.requestId);
            if (!row) continue;
            return { code: 0, placeId: row.placeId, jobId: row.jobId };
        }
    }

    return { code: 1 };
}
