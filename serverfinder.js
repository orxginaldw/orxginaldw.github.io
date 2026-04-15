import { MongoClient } from "mongodb";

const PLACE_IDS = ["6473861193"];
let client = null;
let uri = "";

async function collect(env) {
    const atlas = env.MONGO_URI;
    if (!client || uri !== atlas) {
        if (client) {
            try {
                await client.close();
            } catch {}
        }
        client = new MongoClient(atlas);
        await client.connect();
        uri = atlas;
    }
    const db = client.db("binwoken");
    return {
        serverfinder: db.collection("serverfinder"),
        serverdeepwoken: db.collection("serverdeepwoken"),
    };
}

async function request(url, init) {
    for (let tries = 0; tries < 10; tries++) {
        try {
            const response = await globalThis.fetch(url, init);
            if (!response.ok) {
                throw new Error(String(response.status));
            }
            return await response.json();
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
        for (const server of doc.data || []) {
            const jobId = server.id;
            let set = out.get(jobId);
            if (!set) {
                set = new Set();
                out.set(jobId, set);
            }
            for (const token of server.playerTokens || []) {
                set.add(token);
            }
        }
        cursor = doc.nextPageCursor || "";
        if (!cursor) {
            break;
        }
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
    const rows = new Map();
    for (const placeId of PLACE_IDS) {
        try {
            const part = await merge(placeId, list);
            for (const [jobId, tokens] of part) {
                let set = rows.get(jobId);
                if (!set) {
                    set = new Set();
                    rows.set(jobId, set);
                }
                for (const token of tokens) {
                    set.add(token);
                }
            }
        } catch {}
    }
    if (rows.size === 0) {
        return;
    }
    const { serverfinder } = await collect(env);
    await serverfinder.deleteMany({});
    const docs = [];
    for (const [jobId, tokens] of rows) {
        docs.push({
            job_id: jobId,
            player_tokens: JSON.stringify([...tokens]),
            date: now,
        });
    }
    if (docs.length) {
        await serverfinder.insertMany(docs, { ordered: false });
    }
}

export async function find(userId, env) {
    const now = Date.now();
    const { serverfinder, serverdeepwoken } = await collect(env);
    const latest = await serverfinder
        .find({}, { projection: { _id: 0, date: 1 } })
        .sort({ date: -1 })
        .limit(1)
        .toArray();
    const stamp = latest[0] ? Number(latest[0].date) : 0;
    if (!stamp || now - stamp > 60_000) {
        await env.SERVERFINDER_QUEUE.send({});
    }
    const [rows, lookupRows] = await Promise.all([
        serverfinder
            .find({}, { projection: { _id: 0, job_id: 1, player_tokens: 1 } })
            .toArray(),
        serverdeepwoken
            .find(
                {},
                { projection: { _id: 0, job_id: 1, server_name: 1, realm_name: 1 } },
            )
            .toArray(),
    ]);
    const lookup = new Map(
        lookupRows.map((row) => [
            row.job_id,
            { serverName: row.server_name, realmName: row.realm_name },
        ]),
    );

    const auth = JSON.parse(env.COOKIE_1)[0];
    const userid = String(userId).trim();
    const avatar = await request(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${encodeURIComponent(userid)}&size=150x150&format=Png&isCircular=false`,
        {},
    );
    const avatarUrl = avatar?.data?.[0]?.imageUrl;
    if (!avatarUrl) {
        return { code: 1 };
    }

    const players = [];
    for (const row of rows) {
        let parsed;
        try {
            parsed = JSON.parse(row.player_tokens);
        } catch {
            continue;
        }
        if (!Array.isArray(parsed)) {
            continue;
        }
        for (const token of parsed) {
            players.push({
                token,
                jobId: row.job_id,
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
        for (const item of batch.data || []) {
            if (item.imageUrl !== avatarUrl) {
                continue;
            }
            const row = job.get(item.requestId);
            if (!row) {
                continue;
            }
            const details = lookup.get(row.jobId);
            if (!details) {
                continue;
            }
            return {
                code: 0,
                jobId: row.jobId,
                serverName: details.serverName,
                realmName: details.realmName,
            };
        }
    }

    return { code: 1 };
}
