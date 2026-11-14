import { useState } from "react";
import { BookOpen, Code2 } from "lucide-react";

const nav = [
  {
    label: "Getting started",
    icon: BookOpen,
    items: [
      { id: "overview", label: "Overview" },
      { id: "webhooks", label: "Webhooks" },
    ],
  },
  {
    label: "Endpoints",
    icon: Code2,
    items: [
      { id: "servers", label: "GET /v1/servers" },
      { id: "search", label: "POST /v1/search" },
      { id: "doogle", label: "POST /v1/doogle" },
      { id: "stock", label: "GET /v1/stock" },
      { id: "chime", label: "GET /v1/chime" },
      { id: "users", label: "GET /v1/users" },
      { id: "statistics", label: "GET /v1/statistics" },
    ],
  },
];

export default function DocsPage() {
  const [active, setActive] = useState(window.location.hash.slice(1) || "overview");

  return (
    <div className="docs-page page-fade">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <nav aria-label="API documentation">
            {nav.map((group) => (
              <div key={group.label} className="docs-nav-group">
                <div className="docs-parent">
                  <group.icon size={14} />
                  {group.label}
                </div>
                <div className="docs-subtabs">
                  {group.items.map((item) => (
                    <a key={item.id} href={"#" + item.id} aria-current={active === item.id ? "page" : undefined} onClick={() => setActive(item.id)}>
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <main className="docs-content">
          <div className="docs-content-inner">
            {active === "overview" && (
              <section>
                <h2>Getting started</h2>
                <p>
                  Base URL is <code className="docs-inline">https://api.binwoken.sh</code>. Grab an API key from Settings and send it as a Bearer token.
                </p>
                <ol>
                  <li>Open Settings and copy your API key.</li>
                  <li>
                    Put it in <code className="docs-inline">Authorization: Bearer YOUR_API_KEY</code>.
                  </li>
                  <li>Hit an endpoint below.</li>
                </ol>
              </section>
            )}

            {active === "webhooks" && (
              <section>
                <h2>External webhooks</h2>
                <div className="docs-code">
                  <div className="docs-code-label">User</div>
                  <pre>{`curl -X POST \\\n  -H "Content-Type: application/json" \\\n  -d '{"user_id":"123456789","server_name":"Runic Auburn Hound","realm_name":"East Luminant","job_id":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}' \\\n  https://YOUR_WEBHOOK_URL`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Guild</div>
                  <pre>{`curl -X POST \\\n  -H "Content-Type: application/json" \\\n  -d '{"guild_name":"Example Guild","server_name":"Runic Auburn Hound","realm_name":"East Luminant","job_id":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"}' \\\n  https://YOUR_WEBHOOK_URL`}</pre>
                </div>
                <p>This is what the webhook instance posts to your URL.</p>
              </section>
            )}

            {active === "servers" && (
              <section>
                <h2>Server list</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/servers</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Example</div>
                  <pre>{`curl -H "Authorization: Bearer YOUR_API_KEY" \\\n  https://api.binwoken.sh/v1/servers`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Response</div>
                  <pre>{`[\n  {\n    "job_id": ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"],\n    "server_name": "Runic Auburn Hound",\n    "realm_name": "East Luminant",\n    "players": { "123456789": 1710000000 },\n    "guilds": { "Example Guild": 1710000000 }\n  }\n]`}</pre>
                </div>
                <p>50 credits</p>
              </section>
            )}

            {active === "search" && (
              <section>
                <h2>Search</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/search</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">User</div>
                  <pre>{`curl -X POST \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"userId":"123456789"}' \\\n  https://api.binwoken.sh/v1/search`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Guild</div>
                  <pre>{`curl -X POST \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"guild":"Example Guild"}' \\\n  https://api.binwoken.sh/v1/search`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">User response</div>
                  <pre>{`{\n  "server_name": "Runic Auburn Hound",\n  "realm_name": "East Luminant",\n  "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n}`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Guild response</div>
                  <pre>{`[\n  {\n    "server_name": "Runic Auburn Hound",\n    "realm_name": "East Luminant",\n    "job_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n  }\n]`}</pre>
                </div>
                <p>3 credits</p>
              </section>
            )}

            {active === "doogle" && (
              <section>
                <h2>Alt lookup</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/doogle</span>
                </div>
                <p>503 Service Unavailable</p>
              </section>
            )}

            {active === "stock" && (
              <section>
                <h2>Traan stock</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/stock</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Example</div>
                  <pre>{`curl https://api.binwoken.sh/v1/stock`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Response</div>
                  <pre>{`{\n  "age": 1710000000,\n  "stock": [\n    "Example Item"\n  ]\n}`}</pre>
                </div>
              </section>
            )}

            {active === "chime" && (
              <section>
                <h2>Chime</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/chime</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Example</div>
                  <pre>{`curl https://api.binwoken.sh/v1/chime`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Response</div>
                  <pre>{`{\n  "age": 1710000000,\n  "data": [\n    {\n      "username": "Example",\n      "wins": 0,\n      "losses": 0,\n      "elo_current": 1000,\n      "elo_highest": 1000,\n      "rank_current": 1,\n      "last_played": 1710000000\n    }\n  ]\n}`}</pre>
                </div>
                <p>#chime-matches data.</p>
              </section>
            )}

            {active === "users" && (
              <section>
                <h2>Users</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/users</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Example</div>
                  <pre>{`curl https://api.binwoken.sh/v1/users`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Response</div>
                  <pre>{`{\n  "data": [\n    {\n      "user_id": 123456789,\n      "username": "Example",\n      "created": 1710000000,\n      "seen": 1710000000\n    }\n  ]\n}`}</pre>
                </div>
                <p>returns every Deepwoken player we captured so far.</p>
              </section>
            )}

            {active === "statistics" && (
              <section>
                <h2>Statistics</h2>
                <div className="docs-method">
                  <span className="docs-method-path">/v1/statistics</span>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Example</div>
                  <pre>{`curl https://api.binwoken.sh/v1/statistics`}</pre>
                </div>
                <div className="docs-code">
                  <div className="docs-code-label">Response</div>
                  <pre>{`{\n  "deepwoken": {\n    "days": [\n      {\n        "day": 1710000000,\n        "playing": 0\n      }\n    ],\n    "thumbnail": "https://tr.rbxcdn.com/..."\n  }\n}`}</pre>
                </div>
                <p>last 7 days of Deepwoken peak active count.</p>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
