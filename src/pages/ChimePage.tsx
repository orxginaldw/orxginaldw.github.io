import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Player = {
  username: string;
  wins: number;
  losses: number;
  elo_current: number;
  elo_highest: number;
  rank_current: number | "Unranked";
};

function accent(rank: number | "Unranked") {
  if (rank === "Unranked") return;
  if (rank === 1) return "linear-gradient(180deg, #5a0808 0%, #9a1010 28%, #c01818 45%, #e0c050 68%, #c89830 100%)";
  if (rank <= 10) return "linear-gradient(180deg, #5a1408 0%, #9a2810 28%, #c04018 45%, #ceb656 68%, #b29035 100%)";
  if (rank <= 50) return "linear-gradient(180deg, #dbd39f 0%, #ceb656 35%, #bfa34a 65%, #b29035 100%)";
  if (rank <= 250) return "linear-gradient(180deg, #ffffff 0%, #e4eef8 30%, #b4cce0 65%, #7aabd4 100%)";
  if (rank <= 1000) return "linear-gradient(180deg, #d4b187 0%, #c8a27a 35%, #b48c64 65%, #96764e 100%)";
}

export default function ChimePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const shown = players.filter((player) => player.username.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const rows = shown.slice(start, start + perPage);
  const from = shown.length ? start + 1 : 0;
  const to = Math.min(start + perPage, shown.length);

  useEffect(() => {
    fetch("https://api.binwoken.sh/v1/chime")
      .then((response) => response.json())
      .then((doc) => setPlayers(doc.data));
  }, []);

  return (
    <main className="page-fade px-8 pb-12 pt-5 max-sm:px-4">
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <p className="m-0 text-sm text-muted-foreground">
          Showing <b className="font-semibold text-accent">{shown.length}</b> (of <b className="font-semibold text-accent">{players.length}</b> total) players
        </p>
        <input
          type="text"
          placeholder="Search by username"
          autoComplete="off"
          spellCheck={false}
          className="field h-9 w-full max-w-[320px]"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="w-16 px-4 py-2.5 font-semibold">#</th>
              <th className="px-4 py-2.5 font-semibold">Player</th>
              <th className="w-24 px-4 py-2.5 font-semibold max-sm:w-20">ELO</th>
              <th className="w-24 px-4 py-2.5 font-semibold max-sm:hidden">Peak</th>
              <th className="w-20 px-4 py-2.5 font-semibold">W</th>
              <th className="w-20 px-4 py-2.5 font-semibold">L</th>
              <th className="w-24 px-4 py-2.5 font-semibold max-md:hidden">Winrate</th>
              <th className="w-28 px-4 py-2.5 font-semibold max-lg:hidden">Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((player, index) => {
              const total = player.wins + player.losses;
              const winrate = total ? (player.wins / total) * 100 : 0;
              const color = accent(player.rank_current);
              return (
                <tr key={player.username} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{start + index + 1}</td>
                  <td className="truncate px-4 py-3 font-semibold" style={color ? { backgroundImage: color, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 1px 0 #0a0a0a) drop-shadow(0 -1px 0 #0a0a0a) drop-shadow(1px 0 0 #0a0a0a) drop-shadow(-1px 0 0 #0a0a0a) drop-shadow(0 2px 2px rgba(0,0,0,.55))" } : undefined}>{player.username}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{player.elo_current}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground max-sm:hidden">{player.elo_highest}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{player.wins}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{player.losses}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground max-md:hidden">{winrate.toFixed(1)}%</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground max-lg:hidden">{player.rank_current === "Unranked" ? "Unranked" : `#${player.rank_current}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <button type="button" aria-label="Previous page" disabled={current <= 1} className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-card-hover disabled:pointer-events-none disabled:opacity-40" onClick={() => setPage(current - 1)}>
          <ChevronLeft size={16} />
        </button>
        <button type="button" aria-label="Next page" disabled={current >= pages} className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-card-hover disabled:pointer-events-none disabled:opacity-40" onClick={() => setPage(current + 1)}>
          <ChevronRight size={16} />
        </button>
        Page {current} of {pages} ({from} - {to} of {shown.length} total items)
        <span className="flex-1" />
        Items per page
        <select
          className="h-9 rounded-md border border-border bg-card px-2"
          value={perPage}
          onChange={(event) => {
            setPerPage(Number(event.target.value));
            setPage(1);
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </main>
  );
}
