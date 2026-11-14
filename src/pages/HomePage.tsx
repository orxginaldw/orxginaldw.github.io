import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ListOrdered, X } from "lucide-react";
import CheckBox from "../CheckBox";
import { FinderId, finderHrefs } from "./Finder";
import { api, HistoryCreated, User } from "../api";

type Viewed = { name: string; href: string; type: string; viewedAt: number };

const services = [
  { meta: "Compute", title: "Create a webhook", href: "/instances", time: "~1 min", icon: "compute" },
  { meta: "Identity", title: "Deepwoken Server Finder", href: "/server", time: "~20s", icon: "deepwoken" },
  { meta: "Identity", title: "Discord Alt Finder", href: "/doogle", time: "~20s", icon: "discord" },
  { meta: "REST", title: "API docs", href: "/docs", time: "~30s", icon: "rest" },
  { meta: "API", title: "Traan Stock", href: "https://api.binwoken.sh/v1/stock", time: "~2s", icon: "out" },
  { meta: "Identity", title: "Chime Leaderboard", href: "/chime", time: "~10s", icon: "table" },
  { meta: "Billing", title: "Billing", href: "/billing", time: "instant", icon: "chart" },
];

const sources = [
  { group: "Affiliated (3)", image: "projectrain", title: "Project Rain", text: "Server listings and occupancy." },
  { group: "", image: "palantirx", title: "Palantir X", text: "Server listings and occupancy." },
  { group: "", image: "hamsternalovh", title: "Hamsternal", text: "Server listings and occupancy." },
  { group: "Unaffiliated (2)", image: "doogle", title: "Double Counter", text: "Discord identity and linked accounts." },
  { group: "", image: "deepwoken", title: "Deepwoken Servers", text: "Discord Chime matches and Traan stock." },
];

const news = [
  { date: "Nov 4, 2026", title: "Added Lomastrap" },
  { date: "Nov 2, 2026", title: "Added Luma Mira Github" },
  { date: "Nov 1, 2026", title: "Added Luma Decompiled.lua" },
  { date: "Nov 1, 2026", title: "Added Katalyst Decompiled.lua" },
  { date: "Oct 22, 2026", title: "Added Merostrap.3.02" },
  { date: "Aug 8, 2026", title: "Added e-girl.exe" },
];

const steps = [
  { step: "Step 1", title: "Create a webhook URL in your Discord channel", done: true },
  { step: "Step 2", title: "Create a webhook instance", done: false },
  { step: "Step 3", title: "Add user IDs or guild names", done: false },
  { step: "Step 4", title: "Binwoken posts when they show up", done: false },
];

const endpoints = [
  { meta: "GET /v1/servers", title: "Deepwoken Server list", href: "/docs#servers" },
  { meta: "POST /v1/search", title: "Find a user's or guild's servers", href: "/docs#search" },
  { meta: "POST /v1/doogle", title: "Find Discord alts", href: "/docs#doogle" },
  { meta: "GET /v1/stock", title: "Traan stock", href: "/docs#stock" },
];

type DayStat = { day: number; statistics: number[] };

const uploadSeries = [
  { index: 0, name: "Project Rain", image: "projectrain", color: "#82a9c6" },
  { index: 1, name: "Palantir X", image: "palantirx", color: "#e6e6e6" },
  { index: 2, name: "Hamsternal", image: "hamsternalovh", color: "#6e6e6e" },
] as const;

function StatsLine({ days, series }: { days: DayStat[]; series: (typeof uploadSeries)[number][] }) {
  const [hover, setHover] = useState<{ day: number; ids: number[] } | null>(null);
  const w = 560;
  const h = 180;
  const padL = 4;
  const padR = 4;
  const padT = 14;
  const padB = 10;
  const nearY = 16;
  const max = Math.max(...days.flatMap((day) => series.map((item) => day.statistics[item.index])), 1);
  const xs = days.map((_, dayIndex) => padL + (dayIndex * (w - padL - padR)) / (days.length - 1));
  const yAt = (value: number) => padT + (1 - value / max) * (h - padT - padB);
  const pathFor = (index: number) =>
    xs.map((pointX, dayIndex) => (dayIndex === 0 ? "M" : "L") + pointX.toFixed(1) + " " + yAt(days[dayIndex].statistics[index]).toFixed(1)).join(" ");
  const grids = [0, 0.25, 0.5, 0.75, 1];
  const day = hover === null ? null : days[hover.day];
  const tipLeft = hover === null ? 50 : (xs[hover.day] / w) * 100;
  const tipX = tipLeft < 20 ? "translate-x-0" : tipLeft > 80 ? "-translate-x-full" : "-translate-x-1/2";
  const active = hover === null ? [] : series.filter((item) => hover.ids.includes(item.index));

  const onMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * w;
    const pointerY = ((event.clientY - rect.top) / rect.height) * h;
    let dayIndex = 0;
    let bestX = Math.abs(xs[0] - pointerX);
    for (let pointIndex = 1; pointIndex < xs.length; pointIndex++) {
      const distance = Math.abs(xs[pointIndex] - pointerX);
      if (distance < bestX) {
        dayIndex = pointIndex;
        bestX = distance;
      }
    }
    const points = series.map((item) => ({ id: item.index, y: yAt(days[dayIndex].statistics[item.index]) }));
    let nearest = points[0];
    for (const point of points) {
      if (Math.abs(point.y - pointerY) < Math.abs(nearest.y - pointerY)) nearest = point;
    }
    const ids = points.filter((point) => Math.abs(point.y - nearest.y) <= nearY).map((point) => point.id);
    setHover((previous) => {
      if (previous && previous.day === dayIndex && previous.ids.length === ids.length && previous.ids.every((id, index) => id === ids[index])) return previous;
      return { day: dayIndex, ids };
    });
  };

  return (
    <div className="absolute inset-0" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={"0 0 " + w + " " + h} className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {grids.map((gridStop) => {
          const gridY = padT + gridStop * (h - padT - padB);
          return <line key={gridStop} x1={padL} y1={gridY} x2={w - padR} y2={gridY} stroke="oklch(24% 0.005 250)" strokeWidth="1" vectorEffect="non-scaling-stroke" />;
        })}
        {series.map((item) => (
          <path key={item.index} d={pathFor(item.index)} fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ))}
        {hover && (
          <line x1={xs[hover.day]} y1={padT} x2={xs[hover.day]} y2={h - padB} stroke="oklch(38% 0.005 250)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
        {hover &&
          active.map((series) => (
            <g key={series.index}>
              <line x1={xs[hover.day]} y1={yAt(days[hover.day].statistics[series.index])} x2={xs[hover.day] + 0.01} y2={yAt(days[hover.day].statistics[series.index])} stroke="oklch(var(--card))" strokeWidth="12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <line x1={xs[hover.day]} y1={yAt(days[hover.day].statistics[series.index])} x2={xs[hover.day] + 0.01} y2={yAt(days[hover.day].statistics[series.index])} stroke={series.color} strokeWidth="7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
      </svg>
      <div
        className={"pointer-events-none absolute top-2 z-10 min-w-[140px] rounded-md border border-border bg-card/95 px-2.5 py-2 text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-[left,opacity,transform] duration-150 ease-out " + tipX + " " + (day && active.length ? "opacity-100" : "pointer-events-none opacity-0")}
        style={{ left: tipLeft + "%" }}
      >
        {day && (
          <>
            <div className="mb-1.5 font-semibold">
              {new Date(day.day * 86400 * 1000).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            </div>
            {active.map((series) => (
              <div key={series.index} className="flex items-center gap-2 py-0.5">
                <img src={"/images/" + series.image + ".png"} width={12} height={12} alt="" className="rounded-[3px]" />
                <span className="flex-1 text-muted-foreground">{series.name}</span>
                <span className="font-semibold" style={{ color: series.color }}>
                  {day.statistics[series.index].toLocaleString("en-US")}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function HistoryLink({ href, name, className, openFinder }: { href: string; name: string; className?: string; openFinder: (id: FinderId) => void }) {
  const id = finderHrefs[href];
  if (id) {
    return (
      <button type="button" className={"border-0 bg-transparent p-0 " + (className || "")} onClick={() => openFinder(id)}>
        {name}
      </button>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener" className={className}>
        {name}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {name}
    </Link>
  );
}

function Icon({ name }: { name: string }) {
  if (name === "compute") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20v2" />
        <path d="M12 2v2" />
        <path d="M17 20v2" />
        <path d="M17 2v2" />
        <path d="M2 12h2" />
        <path d="M2 17h2" />
        <path d="M2 7h2" />
        <path d="M20 12h2" />
        <path d="M20 17h2" />
        <path d="M20 7h2" />
        <path d="M7 20v2" />
        <path d="M7 2v2" />
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="8" y="8" width="8" height="8" rx="1" />
      </svg>
    );
  }
  if (name === "deepwoken") {
    return (
      <svg width="27" height="27" viewBox="58 36 108 164" fill="currentColor">
        <g transform="translate(0,224) scale(0.05,-0.05)">
          <path d="M1303.12 3700.08 L1306.90 3700.08 L1334.88 3678.64 L1401.42 3592.87 L1461.91 3495.18 L1504.26 3399.88 L1528.46 3330.79 L1566.26 3183.07 L1596.51 3016.29 L1616.17 2859.04 L1629.78 2673.20 L1635.83 2487.36 L1632.81 2246.73 L1610.12 1933.42 L1593.49 1794.04 L1550.38 1539.11 L1549.63 1503.37 L1556.43 1492.65 L1590.46 1497.41 L1699.35 1553.40 L1796.13 1579.61 L1833.94 1584.38 L1926.19 1582.00 L1992.73 1565.32 L2047.18 1539.11 L2084.98 1543.87 L2106.16 1577.23 L2124.30 1663.00 L2136.40 1841.69 L2143.96 2935.28 L2235.46 3047.26 L2331.49 2935.28 L2339.05 1841.69 L2351.15 1663.00 L2369.30 1577.23 L2390.47 1543.87 L2428.28 1539.11 L2482.72 1565.32 L2549.26 1582.00 L2641.51 1584.38 L2679.32 1579.61 L2776.11 1553.40 L2884.99 1497.41 L2919.02 1492.65 L2925.83 1503.37 L2925.07 1539.11 L2881.97 1794.04 L2865.33 1933.42 L2842.65 2246.73 L2839.63 2487.36 L2845.67 2673.20 L2859.29 2859.04 L2878.95 3016.29 L2909.19 3183.07 L2947.00 3330.79 L2971.20 3399.88 L3013.54 3495.18 L3074.03 3592.87 L3140.57 3678.64 L3163.26 3695.31 L3172.33 3700.08 L3120.91 3533.30 L3095.21 3426.09 L3046.81 3121.12 L3022.61 2820.92 L3015.05 2437.33 L3030.18 2046.59 L3049.84 1829.78 L3075.55 1641.56 L3109.57 1459.29 L3140.57 1334.21 L3169.31 1238.91 L3229.80 1081.66 L3234.34 1024.48 L3221.48 1000.65 L3208.63 993.51 L3163.26 998.27 L3089.16 1038.77 L2995.39 1117.40 L2909.19 1207.94 L2844.16 1267.50 L2739.81 1346.12 L2697.47 1367.57 L2644.54 1384.24 L2599.17 1384.24 L2570.44 1377.10 L2535.65 1358.04 L2505.41 1329.45 L2464.57 1267.50 L2440.38 1219.85 L2413.16 1148.37 L2375.35 1019.71 L2319.39 767.16 L2287.63 648.04 L2261.92 581.33 L2243.02 561.07 L2233.95 559.88 L2213.53 581.33 L2187.82 648.04 L2156.06 767.16 L2100.11 1019.71 L2062.30 1148.37 L2035.08 1219.85 L2010.88 1267.50 L1970.05 1329.45 L1939.80 1358.04 L1905.02 1377.10 L1876.29 1384.24 L1830.92 1384.24 L1777.99 1367.57 L1735.64 1346.12 L1631.29 1267.50 L1566.26 1207.94 L1480.06 1117.40 L1386.30 1038.77 L1312.20 998.27 L1266.83 993.51 L1253.97 1000.65 L1241.12 1024.48 L1245.65 1081.66 L1306.15 1238.91 L1334.88 1334.21 L1365.88 1459.29 L1399.91 1641.56 L1425.62 1829.78 L1445.28 2046.59 L1460.40 2437.33 L1452.84 2820.92 L1428.64 3121.12 L1380.25 3426.09 L1354.54 3533.30 L1303.12 3698.89 Z" />
        </g>
      </svg>
    );
  }
  if (name === "discord") {
    return (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0a13 13 0 0 0-.617-1.25a.08.08 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.1.1 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.08.08 0 0 0 .084-.028a14 14 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13 13 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10 10 0 0 0 .372-.292a.07.07 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.07.07 0 0 1 .078.01q.181.149.373.292a.077.077 0 0 1-.006.127a12.3 12.3 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.08.08 0 0 0 .084.028a19.8 19.8 0 0 0 6.002-3.03a.08.08 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03M8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418" />
      </svg>
    );
  }
  if (name === "rest") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="16" width="6" height="6" rx="1" />
        <rect x="2" y="16" width="6" height="6" rx="1" />
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
        <path d="M12 12V8" />
      </svg>
    );
  }
  if (name === "table") {
    return <ListOrdered size={23} />;
  }
  if (name === "chart") {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v16a2 2 0 0 0 2 2h16" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function ServiceRow({ service, className, openFinder }: { service: (typeof services)[number]; className: string; openFinder: (id: FinderId) => void }) {
  return (
    <div className={"flex items-start gap-3 px-[18px] py-3 " + className}>
      <span className={"flex shrink-0 items-center justify-center text-foreground " + (service.icon === "deepwoken" ? "h-[27px] w-[27px]" : "h-[26px] w-[26px]")}>
        <Icon name={service.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{service.meta}</div>
        <HistoryLink href={service.href} name={service.title} className="font-semibold" openFinder={openFinder} />
      </div>
      <span className="whitespace-nowrap text-muted-foreground">{service.time}</span>
        </div>
  );
}

function Modal({ title, foot, onClose, children }: { title: string; foot: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-[18px] py-3.5 text-base font-semibold tracking-[-0.02em]">
          {title}
          <button type="button" aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-2">{children}</div>
        <div className="border-t border-border px-[18px] py-2.5 text-[13px] text-muted-foreground">{foot}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { openFinder, user } = useOutletContext<{ openFinder: (id: FinderId) => void; user: User | null }>();
  const [historyTab, setHistoryTab] = useState<"viewed" | "created">("viewed");
  const [modal, setModal] = useState<"history" | "services" | "news" | null>(null);
  const [uploadDays, setUploadDays] = useState<DayStat[]>([]);
  const [totals, setTotals] = useState([0, 0, 0]);
  const [created, setCreated] = useState<HistoryCreated[]>([]);
  const [viewed, setViewed] = useState<Viewed[]>([]);
  const [usage, setUsage] = useState<{ label: string; value: string }[]>([]);
  const [webhookDone, setWebhookDone] = useState(false);
  const rows =
    historyTab === "viewed"
      ? viewed.map((row) => ({
          name: row.name,
          href: row.href,
          type: row.type,
          when: new Date(row.viewedAt).toLocaleString(),
        }))
      : created.map((row) => ({
          name: row.name,
          href: row.href,
          type: row.type,
          when: new Date(row.created * 1000).toLocaleString(),
        }));
  const closeModal = () => setModal(null);
  const rankedSeries = [...uploadSeries].filter((series) => totals[series.index] > 0).sort((a, b) => totals[b.index] - totals[a.index]);
  useEffect(() => {
    setViewed(JSON.parse(localStorage.getItem("history.viewed") || "[]"));
    api.created().then(setCreated);
    Promise.all([api.instances(), api.usage()]).then(([instances, rows]) => {
      setWebhookDone(rows.some((row) => row.description.startsWith("Webhook")));
      const now = Date.now() / 1000;
      const spends = rows.filter(
        (row) =>
          row.amount > 0 &&
          row.created >= now - 30 * 86400 &&
          (row.description.startsWith("Server Finder") || row.description.startsWith("Webhook")),
      );
      const days = spends.length ? Math.max(1, Math.min(30, Math.ceil((now - Math.min(...spends.map((row) => row.created))) / 86400))) : 1;
      const monthly = spends.length ? spends.reduce((sum, row) => sum + row.amount, 0) / days * 30 * 0.01 : 0;
      setUsage([
        { label: "Cost", value: "$" + monthly.toFixed(2) + "/month" },
        { label: "Searches", value: String(rows.filter((row) => row.description.startsWith("Server Finder")).length) },
        { label: "Webhooks", value: String(instances.length) },
        { label: "HTTP/S", value: String(rows.filter((row) => row.description.startsWith("REST")).length) },
      ]);
    });
  }, []);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      api.statistics().then((doc) => {
        setUploadDays(doc.partners.days);
        setTotals(doc.partners.totals);
      });
    };
    sync();
    const id = setInterval(sync, 30000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return (
    <>
      <div className="page-fade px-8 pb-12 pt-5 max-sm:px-4">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] items-stretch gap-4 max-lg:grid-cols-1">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="card">
              <div className="card-h">History</div>
              <div className="grid grid-cols-[200px_minmax(0,1fr)] max-md:grid-cols-1">
                <div className="flex flex-col border-r border-border py-2 pb-4 max-md:border-b max-md:border-r-0">
                  {(["viewed", "created"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={"w-full border-0 bg-transparent px-4 py-2.5 text-left " + (historyTab === tab ? "bg-card-hover font-semibold text-foreground shadow-[inset_2px_0_0_oklch(var(--primary))]" : "text-muted-foreground hover:bg-card-hover")}
                      onClick={() => setHistoryTab(tab)}
                    >
                      Recently {tab}
                    </button>
                  ))}
      </div>
                <div className="flex min-h-0 flex-col overflow-hidden px-4 py-3 pb-4">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    <span className="pill">GB (London)</span>
                    <span className="flex-1" />
                    <button type="button" className="ghost" onClick={() => setModal("history")}>
                      View all History
                    </button>
          </div>
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="px-2.5 py-2 font-semibold">Name</th>
                          <th className="px-2.5 py-2 font-semibold">Type</th>
                          <th className="-translate-x-11 px-2.5 py-2 text-center font-semibold">Status</th>
                          <th className="px-2.5 py-2 font-semibold">
                            {historyTab === "viewed" ? "Viewed" : "Created"}{" "}
                            <svg className="inline" width="10" height="10" viewBox="0 0 20 20">
                              <polygon points="5 7 15 7 10 12" fill="currentColor" />
                            </svg>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 4).map((row) => (
                          <tr key={row.name} className="border-b border-border">
                            <td className="px-2.5 py-2.5">
                              <HistoryLink href={row.href} name={row.name} openFinder={openFinder} />
                            </td>
                            <td className="px-2.5 py-2.5">{row.type}</td>
                            <td className="px-2.5 py-2.5 text-center align-middle">
                              <span className="inline-grid h-4 w-4 -translate-x-11 place-items-center text-white" title="Success">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              </span>
                            </td>
                            <td className="px-2.5 py-2.5">{row.when}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
          </div>
                  <div className="px-2.5 py-2.5 text-[13px] text-muted-foreground">{Math.min(rows.length, 4)} results shown.</div>
      </div>
    </div>
    </div>

            <div className="card flex min-h-0 flex-1 flex-col">
              <div className="card-h">
                <span>Statistics</span>
                <span className="pill">Last 7 days</span>
        </div>
              <div className="flex flex-wrap gap-4 px-[18px] pb-1 pt-1">
                {rankedSeries.map((series) => (
                  <div key={series.index} className="flex items-center gap-2">
                    <img src={"/images/" + series.image + ".png"} width={16} height={16} alt="" className="rounded-[4px]" />
          <div>
                      <div className="text-xs text-muted-foreground">{series.name}</div>
                      <div className="text-lg font-bold leading-none tracking-tight" style={{ color: series.color }}>
                        {totals[series.index].toLocaleString("en-US")}
          </div>
        </div>
          </div>
                ))}
        </div>
              <div className="relative min-h-0 flex-1 basis-0 px-[18px] pt-3">
                {uploadDays.length > 0 && <StatsLine days={uploadDays} series={rankedSeries} />}
          </div>
              <div className="flex justify-between px-[18px] pb-4 pt-2 text-[11px] text-muted-foreground">
                {uploadDays.map((day) => (
                  <span key={day.day}>{new Date(day.day * 86400 * 1000).getUTCDate()}</span>
                ))}
        </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="card">
              <div className="card-h">Services</div>
              {services.slice(0, 4).map((service) => (
                <ServiceRow key={service.title} service={service} className="" openFinder={openFinder} />
              ))}
              <div className="flex items-center gap-4 px-[18px] pb-4 pt-2">
                <button type="button" className="ghost" onClick={() => setModal("services")}>
                  Show all
                </button>
        </div>
            </div>

            <div className="card">
              <div className="card-h">Sources</div>
              {sources.map((source) => (
                <div key={source.title}>
                  {source.group && <h3 className="m-0 px-[18px] pb-2 pt-1 text-[13px] font-semibold text-muted-foreground">{source.group}</h3>}
                  <div className="flex items-center gap-3 px-[18px] py-3">
                    <img src={"/images/" + source.image + ".png"} width={20} height={20} alt="" className="rounded-[5px] object-cover" />
            <div>
                      <div className="font-semibold">{source.title}</div>
                      <div className="text-xs text-muted-foreground">{source.text}</div>
            </div>
          </div>
        </div>
              ))}
      </div>
      </div>

          <div className="col-span-full grid grid-cols-[minmax(0,1.15fr)_minmax(280px,1fr)] items-stretch gap-4 max-lg:grid-cols-1">
            <div className="card flex h-full flex-col">
        <div className="card-h">News</div>
              <p className="m-0 px-[18px] pb-2 pt-1 text-[13px] text-muted-foreground">Release notes</p>
              <div className="px-2">
                {news.map((item) => (
                  <div key={item.date} className="flex gap-4 px-2.5 py-1.5">
                    <time className="w-[92px] shrink-0 text-muted-foreground">{item.date}</time>
                    <button type="button" className="flex-1 border-0 bg-transparent p-0 text-left hover:underline" onClick={() => setModal("news")}>
                      {item.title}
                    </button>
          </div>
                ))}
          </div>
              <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
                <button type="button" className="ghost" onClick={() => setModal("news")}>
                  Release notes
                </button>
        </div>
      </div>
            <div className="card flex h-full flex-col">
              <div className="card-h">Usage</div>
              <p className="m-0 px-[18px] pb-2 pt-1 text-[13px] text-muted-foreground">Request activity</p>
              <div className="my-auto grid grid-cols-3 gap-2 px-[18px]">
                {user &&
                  [
                    ...usage,
                    { label: "Credits", value: String(user.credits) },
                    { label: "CF-Connecting-IP", value: user.ip },
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border bg-tile p-2.5">
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="mt-1.5 text-xl font-bold">{item.value}</div>
                    </div>
                  ))}
        </div>
              <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
                <Link to="/billing" className="ghost hover:no-underline">
                  All usage
                </Link>
        </div>
      </div>
    </div>

          <div className="col-span-full grid grid-cols-2 items-stretch gap-4 max-md:grid-cols-1">
            <div className="card flex flex-col">
              <div className="card-h">Getting started</div>
              <p className="m-0 px-[18px] pb-3.5 text-[13px] text-muted-foreground">Setting up a Discord webhook</p>
              {steps.map((item) => (
                <div key={item.step} className="flex items-start gap-3 px-[18px] py-3">
                  <span className="mt-0.5">
                    <CheckBox checked={webhookDone || item.done} />
                  </span>
                  <div>
                    <div className="text-xs text-muted-foreground">{item.step}</div>
                    <div className="font-semibold">{item.title}</div>
        </div>
        </div>
              ))}
              <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
                <button type="button" className="ghost" disabled>
                  Back
                </button>
                <button type="button" className="ghost" disabled>
                  Next
                </button>
        </div>
        </div>
            <div className="card flex flex-col">
              <div className="card-h">Learn</div>
              <p className="m-0 px-[18px] pb-3.5 text-[13px] text-muted-foreground">API Reference</p>
              {endpoints.map((item) => (
                <div key={item.href} className="flex items-start gap-3 px-[18px] py-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                    <path d="M15 3h6v6" />
                    <path d="M10 14 21 3" />
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  </svg>
                  <div>
                    <div className="text-xs text-muted-foreground">{item.meta}</div>
                    <Link to={item.href} className="font-semibold">
                      {item.title}
                    </Link>
        </div>
      </div>
              ))}
              <div className="mt-auto flex items-center gap-4 px-[18px] pb-4 pt-2">
                <Link to="/docs" className="ghost hover:no-underline">
                  View Docs
                </Link>
      </div>
    </div>
    </div>
  </div>
      </div>
      {modal === "history" && (
        <Modal title="History" foot={viewed.length + created.length + " results"} onClose={closeModal}>
          <table className="w-full border-collapse">
          <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-[18px] py-2.5">Name</th>
                <th className="px-[18px] py-2.5">Type</th>
                <th className="px-[18px] py-2.5">Status</th>
                <th className="px-[18px] py-2.5">Viewed</th>
              </tr>
          </thead>
          <tbody>
              {[
                ...viewed.map((row) => ({
                  name: row.name,
                  href: row.href,
                  type: row.type,
                  when: new Date(row.viewedAt).toLocaleString(),
                })),
                ...created.map((row) => ({
                  name: row.name,
                  href: row.href,
                  type: row.type,
                  when: new Date(row.created * 1000).toLocaleString(),
                })),
              ].map((row) => (
                <tr key={row.name} className="border-b border-border last:border-0">
                  <td className="px-[18px] py-2.5">
                    {row.href === "#" ? (
                      <button type="button" className="border-0 bg-transparent p-0 hover:underline" onClick={() => setModal("news")}>
                        {row.name}
                      </button>
                    ) : (
                      <HistoryLink href={row.href} name={row.name} openFinder={openFinder} />
                    )}
                  </td>
                  <td className="px-[18px] py-2.5">{row.type}</td>
                  <td className="px-[18px] py-2.5">Success</td>
                  <td className="px-[18px] py-2.5">{row.when}</td>
            </tr>
              ))}
          </tbody>
        </table>
        </Modal>
      )}
      {modal === "services" && (
        <Modal title="Services" foot="7 services" onClose={closeModal}>
          {services.map((service) => (
            <ServiceRow key={service.title} service={service} className="hover:bg-card-hover" openFinder={openFinder} />
          ))}
        </Modal>
      )}
      {modal === "news" && (
        <Modal title="Release notes" foot={news.length + " releases"} onClose={closeModal}>
          {news.map((item) => (
            <div key={item.title} className="flex gap-4 border-b border-border px-[18px] py-3.5 last:border-0">
              <time className="text-muted-foreground">{item.date}</time>
          <div className="font-semibold">{item.title}</div>
      </div>
          ))}
        </Modal>
      )}
    </>
  );
}
