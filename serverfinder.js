const PLACE_IDS = ["6473861193", "5735553160", "6032399813"];

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
            await sleep(3000);
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
    }
    return merged;
}

export async function run(env) {
    const cookies = await env.DB.prepare(
        "SELECT cookie FROM cookies ORDER BY id",
    ).all();
    const list = cookies.results.map((row) => row.cookie);
    const now = Date.now();
    for (const placeId of PLACE_IDS) {
        const rows = await merge(placeId, list);
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
    if (!stamp.date || now - stamp.date > 60000) {
        run(env).catch(() => {});
    }

    const cookies = await env.DB.prepare(
        "SELECT cookie FROM cookies ORDER BY id",
    ).all();
    const auth = cookies.results[0].cookie;
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

    for (let i = 0; i < players.length; i += 100) {
        const chunk = players.slice(i, i + 100);
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
