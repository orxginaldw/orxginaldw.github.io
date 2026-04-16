import { MongoClient } from "mongodb";

const PLACE_IDS = ["6473861193", "5735553160", "6032399813"];

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

function merge(rows, doc) {
    for (const server of doc.data || []) {
        const jobId = server.id;
        let set = rows.get(jobId);
        if (!set) {
            set = new Set();
            rows.set(jobId, set);
        }
        for (const token of server.playerTokens || []) {
            set.add(token);
        }
    }
}

function serialize(rows) {
    const o = {};
    for (const [jobId, tokens] of rows) {
        o[jobId] = [...tokens];
    }
    return JSON.stringify(o);
}

function deserialize(json) {
    const o = JSON.parse(json || "{}");
    const m = new Map();
    for (const [k, arr] of Object.entries(o)) {
        m.set(k, new Set(Array.isArray(arr) ? arr : []));
    }
    return m;
}

async function load(db) {
    const row = await db.prepare(
        'SELECT place, cookie, cursor, "index", "now" FROM serverfinder WHERE id = ?',
    )
        .bind("state")
        .first();
    return row || null;
}

async function save(db, place, cookie, cursor, rows, now) {
    const index = serialize(rows);
    await db.prepare(
        'REPLACE INTO serverfinder (id, place, cookie, cursor, "index", "now") VALUES (?, ?, ?, ?, ?, ?)',
    )
        .bind("state", place, cookie, cursor, index, now)
        .run();
}

async function clear(db) {
    await db.prepare("DELETE FROM serverfinder WHERE id = ?")
        .bind("state")
        .run();
}

async function commit(env, rows, now) {
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

export async function run(env) {
    const db = env.DB;
    const list = [...JSON.parse(env.COOKIE_1), ...JSON.parse(env.COOKIE_2)];
    if (!list.length) {
        await clear(db);
        return;
    }

    const existing = await load(db);
    let place;
    let cookie;
    let cursor;
    let rows;
    let now;

    if (existing) {
        place = existing.place;
        cookie = existing.cookie;
        cursor = existing.cursor ?? "";
        rows = deserialize(existing.index);
        now = existing.now;
    } else {
        place = 0;
        cookie = 0;
        cursor = "";
        rows = new Map();
        now = Date.now();
    }

    let fetches = 0;
    while (fetches < 32) {
        if (place >= PLACE_IDS.length) {
            if (rows.size === 0) {
                await clear(db);
                return;
            }
            await commit(env, rows, now);
            await clear(db);
            return;
        }

        const placeId = PLACE_IDS[place];
        if (cookie >= list.length) {
            place++;
            cookie = 0;
            cursor = "";
            continue;
        }

        const string = list[cookie];
        const url = cursor
            ? `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100&cursor=${encodeURIComponent(cursor)}`
            : `https://games.roblox.com/v1/games/${placeId}/servers/Public?limit=100`;

        let doc;
        try {
            doc = await request(url, { headers: { Cookie: string } });
        } catch {
            cookie++;
            cursor = "";
            if (cookie >= list.length) {
                place++;
                cookie = 0;
            }
            continue;
        }

        fetches++;
        merge(rows, doc);
        const next = doc.nextPageCursor || "";
        if (next) {
            cursor = next;
        } else {
            cookie++;
            cursor = "";
            if (cookie >= list.length) {
                place++;
                cookie = 0;
            }
        }
    }

    await save(db, place, cookie, cursor, rows, now);
}

export async function find(userId, env) {
    const { serverfinder, serverdeepwoken } = await collect(env);
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
