const PLACE_IDS = ["6473861193", "5735553160", "6032399813"];
let running = null;

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

function build(env, placeId, rows, prior, now) {
    const statements = [];
    if (rows.size === 0) {
        if (prior.size > 0) {
            statements.push(
                env.DB.prepare("DELETE FROM serverfinder WHERE place_id = ?").bind(
                    placeId,
                ),
            );
        }
        return statements;
    }
    for (const jobId of prior.keys()) {
        if (!rows.has(jobId)) {
            statements.push(
                env.DB.prepare(
                    "DELETE FROM serverfinder WHERE place_id = ? AND job_id = ?",
                ).bind(placeId, jobId),
            );
        }
    }
    for (const [jobId, tokens] of rows) {
        const next = JSON.stringify([...tokens].sort());
        const prev = prior.get(jobId);
        if (prev == null) {
            statements.push(
                env.DB.prepare(
                    "INSERT INTO serverfinder (place_id, job_id, player_tokens, date) VALUES (?, ?, ?, ?)",
                ).bind(placeId, jobId, next, now),
            );
        } else if (prev !== next) {
            statements.push(
                env.DB.prepare(
                    "UPDATE serverfinder SET player_tokens = ?, date = ? WHERE place_id = ? AND job_id = ?",
                ).bind(next, now, placeId, jobId),
            );
        }
    }
    return statements;
}

function set(env, placeId, rows, prior, now) {
    const statements = [];
    for (const [jobId, prev] of prior) {
        const tokens = rows.get(jobId);
        if (!tokens) continue;
        const next = JSON.stringify([...tokens].sort());
        if (prev !== next) {
            statements.push(
                env.DB.prepare(
                    "UPDATE serverfinder SET player_tokens = ?, date = ? WHERE place_id = ? AND job_id = ?",
                ).bind(next, now, placeId, jobId),
            );
        }
    }
    return statements;
}

async function sync(env, placeId, list, now, refresh) {
    const rows = await merge(placeId, list);
    const existing = await env.DB.prepare(
        "SELECT job_id, player_tokens FROM serverfinder WHERE place_id = ?",
    ).bind(placeId).all();
    const prior = new Map(
        existing.results.map((row) => [row.job_id, row.player_tokens]),
    );
    const statements = refresh
        ? build(env, placeId, rows, prior, now)
        : set(env, placeId, rows, prior, now);
    if (statements.length) {
        await env.DB.batch(statements);
    }
}

export async function run(env, refresh = true) {
    if (running) {
        return running;
    }
    running = (async () => {
        const list = [...JSON.parse(env.COOKIE_1), ...JSON.parse(env.COOKIE_2)];
        const now = Date.now();
        for (const placeId of PLACE_IDS) {
            try {
                await sync(env, placeId, list, now, refresh);
            } catch {}
        }
        await env.DB.prepare(
            "INSERT INTO meta (key, value) VALUES ('date', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        ).bind(now).run();
        if (refresh) {
            await env.DB.prepare(
                "INSERT INTO meta (key, value) VALUES ('stamp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            ).bind(now).run();
        }
    })();
    try {
        await running;
    } finally {
        running = null;
    }
}

export async function find(userId, env) {
    const now = Date.now();
    const date = await env.DB.prepare(
        "SELECT value FROM meta WHERE key = 'date'",
    ).first("value");
    const rows = await env.DB.prepare(
        "SELECT job_id, player_tokens FROM serverfinder",
    ).all();
    const lookupRows = await env.DB.prepare(
        "SELECT job_id, server_name, realm_name FROM serverdeepwoken",
    ).all();
    const lookup = new Map(
        lookupRows.results.map((row) => [
            row.job_id,
            { serverName: row.server_name, realmName: row.realm_name },
        ]),
    );
    if (!date || now - Number(date) > 60_000) {
        const stamp = await env.DB.prepare(
            "SELECT value FROM meta WHERE key = 'stamp'",
        ).first("value");
        const refresh = !stamp || now - Number(stamp) > 300_000;
        await env.SERVERFINDER_QUEUE.send({ refresh });
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
            });
        }
    }

    for (let index = 0; index < players.length; index += 100) {
        const chunk = players.slice(index, index + 100);
        const jobIds = new Set(chunk.map((x) => x.jobId));
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
            if (!jobIds.has(item.requestId)) continue;
            const details = lookup.get(item.requestId);
            if (!details) continue;
            return {
                code: 0,
                jobId: item.requestId,
                serverName: details.serverName,
                realmName: details.realmName,
            };
        }
    }

    return { code: 1 };
}
