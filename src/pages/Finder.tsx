import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "../api";
import Turnstile from "../Turnstile";

export type FinderId = "server" | "doogle";

export const finderHrefs: Record<string, FinderId> = {
  "/server": "server",
  "/doogle": "doogle",
};

const realms: Record<string, string> = {
  EastLuminant: "East Luminant",
  EtreanLuminant: "Etrean Luminant",
  Depths: "The Depths",
};

function ServerFinder({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"userid" | "username" | "guild">("userid");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [users, setUsers] = useState(0);
  const [guilds, setGuilds] = useState(0);
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);

  useEffect(() => {
    api.searches().then((row) => {
      setUsers(row.users);
      setGuilds(row.guilds);
    });
  }, []);

  const search = () => {
    if (!token) return;
    setResult("Searching...");
    const body =
      mode === "username"
        ? { username: query, turnstile: token }
        : mode === "guild"
          ? { guild: query, turnstile: token }
          : { userId: query, turnstile: token };
    api.search(body).then(({ status, body: json }) => {
      setReset((count) => count + 1);
      if (status === 400) {
        setResult(json.message);
        return;
      }
      if (status === 402) {
        setResult("Not enough credits");
        return;
      }
      if (status === 404) {
        setResult("Not Found");
        return;
      }
      window.dispatchEvent(new Event("user-changed"));
      if (Array.isArray(json)) {
        setResult(json.map((row) => "Server: " + row.server_name + " | Realm: " + realms[row.realm_name]).join("\n"));
        setGuilds((count) => count + 1);
        return;
      }
      setResult("Server: " + json.server_name + " | Realm: " + realms[json.realm_name]);
      setUsers((count) => count + 1);
    });
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal w-[min(440px,100%)]" onClick={(event) => event.stopPropagation()}>
        <div className="relative px-[18px] pb-5 pt-4">
          <button type="button" aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={onClose}>
            <X size={18} />
          </button>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Lookup</div>
          <h2 className="mb-4 pr-8 text-[22px] font-bold tracking-[-0.03em]">Server Finder</h2>
          <div className="mb-3.5 flex flex-wrap gap-1 border-b border-border">
            <button type="button" className={"border-0 bg-transparent px-3 py-2 text-sm " + (mode === "userid" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground hover:text-foreground")} onClick={() => setMode("userid")}>
              User ID
            </button>
            <button type="button" className={"border-0 bg-transparent px-3 py-2 text-sm " + (mode === "username" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground hover:text-foreground")} onClick={() => setMode("username")}>
              Username
            </button>
            <button type="button" className={"border-0 bg-transparent px-3 py-2 text-sm " + (mode === "guild" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground hover:text-foreground")} onClick={() => setMode("guild")}>
              Guild
            </button>
          </div>
          <label className="mb-1.5 block text-[13px] font-semibold">{mode === "username" ? "Roblox Username" : mode === "guild" ? "Deepwoken Guild" : "Roblox User ID"}</label>
          <input
            type="text"
            placeholder={mode === "username" ? "Enter username" : mode === "guild" ? "Enter guild name" : "Enter user ID"}
            className="field mb-3.5 h-9 w-full"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && search()}
          />
          <p className="mb-1.5 text-[11px] text-muted-foreground">{mode === "guild" ? "Total Guilds Found: " + guilds : "Total Users Found: " + users}</p>
          <p className="mb-3.5 text-[11px] text-muted-foreground">Cost: 1 credit</p>
          <Turnstile onToken={setToken} reset={reset} />
          {result && <p className="mb-3.5 whitespace-pre-wrap text-[13px] text-muted-foreground">{result}</p>}
          <button type="button" className="btn-dark h-9 w-full" disabled={!token} onClick={search}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}

function DoogleFinder({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal w-[min(1100px,100%)] max-h-[min(90vh,760px)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/images/doogle.png" width={28} height={28} alt="" />
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-[-0.02em]">Alt Finder</div>
              <p className="m-0 text-[13px] text-muted-foreground">Look up Discord alt accounts linked to a user ID.</p>
            </div>
          </div>
          <button type="button" aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">
            <section className="panel flex flex-col p-4 pb-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                <span className="text-muted-foreground">Lookup</span>
                <span className="text-xs font-medium text-warning">503 Service Unavailable</span>
              </div>
              <div className="pointer-events-none opacity-45">
                <div className="mb-3.5">
                  <label className="mb-1.5 block text-[13px] font-semibold">Discord User ID</label>
                  <input type="text" placeholder="Enter Discord ID" disabled className="h-9 w-full rounded-md border border-border bg-search px-3 outline-none disabled:cursor-not-allowed" />
                  <p className="mt-1.5 text-xs text-muted-foreground">1 search every 3 days.</p>
                </div>
                <div className="flex items-center justify-center py-2">
                  <img src="/images/oraclecloudinfrastructure.png" alt="" className="h-40 w-full object-contain" />
                </div>
                <div className="mt-auto flex justify-end pt-4">
                  <button type="button" className="btn-dark min-w-24 max-[800px]:w-full" disabled>
                    Search
                  </button>
                </div>
              </div>
            </section>
            <section className="pointer-events-none flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-border bg-code opacity-45">
              <div className="border-b border-border bg-input px-3.5 py-2.5 text-xs font-semibold uppercase tracking-[0.02em] text-muted-foreground">Output</div>
              <div className="flex-1 overflow-auto px-3.5 py-3 font-mono text-[13px] leading-[1.65] text-muted-foreground" />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Finder({ id, onClose }: { id: FinderId; onClose: () => void }) {
  if (id === "doogle") return <DoogleFinder onClose={onClose} />;
  return <ServerFinder onClose={onClose} />;
}
