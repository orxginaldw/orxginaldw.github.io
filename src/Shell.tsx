import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Code2, CreditCard, HelpCircle, LogOut, Menu, Search, User as UserIcon, X } from "lucide-react";
import Finder, { FinderId, finderHrefs } from "./pages/Finder";
import { api, User } from "./api";

const pages: Record<string, { name: string; type: string }> = {
  "/": { name: "Downloads", type: "Downloads" },
  "/instances": { name: "Instances", type: "Compute" },
  "/create": { name: "Create webhook", type: "Compute" },
  "/docs": { name: "REST API", type: "Developer" },
  "/billing": { name: "Billing", type: "Billing" },
  "/notifications": { name: "Notifications", type: "Billing" },
  "/settings": { name: "Settings", type: "Account" },
  "/chime": { name: "Chime Leaderboard", type: "Identity" },
  "/server": { name: "Deepwoken Server Finder", type: "Identity" },
  "/doogle": { name: "Discord Alt Finder", type: "Identity" },
};

function recordView(href: string) {
  const page = pages[href];
  const viewed = JSON.parse(localStorage.getItem("history.viewed") || "[]") as { href: string }[];
  localStorage.setItem(
    "history.viewed",
    JSON.stringify([{ name: page.name, href, type: page.type, viewedAt: Date.now() }, ...viewed.filter((row) => row.href !== href)].slice(0, 20)),
  );
}

const navCategories = [
  { id: "home", label: "Home" },
  { id: "compute", label: "Compute" },
  { id: "identity", label: "Identity" },
  { id: "billing", label: "Billing" },
  { id: "downloads", label: "Downloads" },
];

const navPanels: Record<string, { title: string; links: { label: string; href: string; meta?: string }[] }[]> = {
  home: [
    {
      title: "Home",
      links: [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Instances", href: "/instances" },
        { label: "Create webhook", href: "/create" },
        { label: "Billing", href: "/billing" },
      ],
    },
    {
      title: "Pinned",
      links: [
        { label: "Downloads", href: "/", meta: "Downloads" },
        { label: "Server Finder", href: "/server", meta: "Identity" },
        { label: "REST API", href: "/docs", meta: "Developer" },
      ],
    },
  ],
  compute: [
    {
      title: "Compute",
      links: [
        { label: "Instances", href: "/instances" },
        { label: "Create webhook", href: "/create" },
      ],
    },
    {
      title: "Related",
      links: [
        { label: "Billing", href: "/billing" },
        { label: "REST API", href: "/docs" },
      ],
    },
  ],
  identity: [
    {
      title: "Identity",
      links: [
        { label: "Chime Leaderboard", href: "/chime" },
        { label: "Server Finder", href: "/server" },
        { label: "Alt Finder", href: "/doogle" },
      ],
    },
    { title: "Related", links: [{ label: "Traan Stock", href: "https://api.binwoken.sh/v1/stock" }] },
  ],
  billing: [
    {
      title: "Billing",
      links: [
        { label: "Billing", href: "/billing" },
        { label: "Notifications", href: "/notifications" },
      ],
    },
  ],
};

const searchCatalog = {
  Services: [
    { label: "Server Finder", tag: "Identity", href: "/server" },
    { label: "Alt Finder", tag: "Identity", href: "/doogle" },
    { label: "Chime Leaderboard", tag: "Identity", href: "/chime" },
    { label: "Traan Stock", tag: "API", href: "https://api.binwoken.sh/v1/stock" },
    { label: "Create webhook", tag: "Compute", href: "/create" },
    { label: "Billing", tag: "Billing", href: "/billing" },
  ],
  Resources: [
    { label: "Instances", tag: "Compute", href: "/instances" },
  ],
  Documentation: [
    { label: "REST API", tag: "Reference", href: "/docs" },
    { label: "GET /v1/servers — live server list", tag: "API", href: "/docs#servers" },
    { label: "POST /v1/search — find a user or guild", tag: "API", href: "/docs#search" },
    { label: "POST /v1/doogle — Discord alts", tag: "API", href: "/docs#doogle" },
    { label: "GET /v1/stock — Traan stock", tag: "API", href: "/docs#stock" },
  ],
  Downloads: [
    { label: "Binwoken.exe", tag: "Tool", href: "/" },
    { label: "e-girl.exe", tag: "Tool", href: "/" },
    { label: "The FML Macro", tag: "Macro", href: "/" },
    { label: "cage macro.ahk", tag: "Macro", href: "/" },
    { label: "Pistachio Cream Menu", tag: "UI", href: "/" },
    { label: "Lycoris Auto-Parry Timings", tag: "Timing", href: "/" },
  ],
};

const iconButton = "grid h-10 w-10 place-items-center rounded-md hover:bg-card-hover hover:no-underline";
const userLink = "flex w-full items-center gap-2.5 rounded px-2.5 py-[9px] text-left hover:bg-card-hover hover:no-underline [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground";

export default function Shell() {
  const location = useLocation();
  const onDashboard = location.pathname === "/dashboard";
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [navCategory, setNavCategory] = useState("home");
  const [navFilter, setNavFilter] = useState("");
  const [mobilePanel, setMobilePanel] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [finder, setFinder] = useState<FinderId | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(() => !localStorage.getItem("notifications.rework"));
  const searchWrap = useRef<HTMLDivElement>(null);
  const bellMenu = useRef<HTMLDivElement>(null);
  const userMenu = useRef<HTMLDivElement>(null);
  const initials = user ? (user.first_name[0] + user.last_name[0]).toUpperCase() : "";
  const displayName = user ? user.first_name + " " + user.last_name : "";

  const openFinder = (id: FinderId) => {
    recordView(id === "server" ? "/server" : "/doogle");
    setFinder(id);
    setNavOpen(false);
    setSearchOpen(false);
  };

  function PanelLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
    const id = finderHrefs[href];
    if (id) {
      return (
        <button type="button" className={className + " w-full border-0 bg-transparent text-left"} onClick={() => openFinder(id)}>
          {children}
        </button>
      );
    }
    if (href.startsWith("http")) {
      return (
        <a href={href} target="_blank" rel="noopener" className={className}>
          {children}
        </a>
      );
    }
    return (
      <Link to={href} className={className}>
        {children}
      </Link>
    );
  }

  useEffect(() => {
    setNavOpen(false);
    setMobilePanel(false);
    setSearchOpen(false);
    setBellOpen(false);
    setUserOpen(false);
    if (location.pathname !== "/dashboard") recordView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => api.me().then(setUser);
    sync();
    window.addEventListener("user-changed", sync);
    return () => window.removeEventListener("user-changed", sync);
  }, []);

  useEffect(() => {
    const sync = () => setUnread(!localStorage.getItem("notifications.rework"));
    window.addEventListener("notifications-changed", sync);
    return () => window.removeEventListener("notifications-changed", sync);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", navOpen);
  }, [navOpen]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchWrap.current.contains(target)) setSearchOpen(false);
      if (!bellMenu.current.contains(target)) setBellOpen(false);
      if (!userMenu.current.contains(target)) setUserOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavOpen(false);
      setSearchOpen(false);
      setBellOpen(false);
      setUserOpen(false);
      setFinder(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const visibleCategories = navCategories.filter((cat) => cat.label.toLowerCase().includes(navFilter.trim().toLowerCase()));
  const panelCols = navPanels[navCategory];
  const drawerWidth = panelCols.length > 1 ? "min(640px,100vw)" : "min(460px,100vw)";

  const query = searchQuery.trim().toLowerCase();
  const searchHits = (items: { label: string; tag: string; href: string }[]) =>
    query ? items.filter((item) => (item.label + " " + item.tag).toLowerCase().includes(query)).slice(0, 6) : items.slice(0, 4);

  return (
    <>
      <header className="sticky top-0 z-[100] flex h-[60px] items-center gap-1 border-b border-border bg-header pl-2 pr-3">
        <button type="button" aria-label="Navigation menu" aria-expanded={navOpen} className={iconButton + " aria-expanded:bg-card-hover"} onClick={() => setNavOpen(!navOpen)}>
          <Menu size={20} />
        </button>
        <Link to={onDashboard ? "/" : "/dashboard"} className="px-2 font-semibold tracking-[-0.02em] hover:no-underline">
          {onDashboard ? "Downloads" : "Dashboard"}
        </Link>
        <div className="relative mx-auto w-full max-w-[640px] flex-1" ref={searchWrap}>
          <div className={"flex h-9 items-center gap-2 rounded-md border bg-search px-2.5 " + (searchOpen ? "border-[oklch(45%_0.01_250)]" : "border-border")}>
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              type="search"
              autoComplete="off"
              placeholder="Search resources, services, documentation, and downloads"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm leading-none outline-none [&::-webkit-search-cancel-button]:appearance-none"
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onClick={() => setSearchOpen(true)}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button type="button" aria-label="Clear search" className="grid h-6 w-6 shrink-0 place-items-center rounded text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={() => setSearchQuery("")}>
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>
          {searchOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[110] max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-border bg-card shadow-[0_16px_48px_rgba(0,0,0,0.55)] animate-in fade-in slide-in-from-top-2 duration-200">
              {Object.entries(searchCatalog).map(([group, items]) => (
                <div key={group} className="border-b border-border px-4 py-2.5 first:border-0 first:pb-2 first:pt-3.5">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <b className="text-[13px] font-bold">{group}</b>
                    {group === "Services" && (
                      <button
                        type="button"
                        className="border-0 bg-transparent p-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        onClick={() => {
                          setSearchOpen(false);
                          setNavOpen(false);
                          navigate("/");
                        }}
                      >
                        View all
                      </button>
                    )}
                  </div>
                  {searchHits(items).map((item) => (
                    <PanelLink key={item.label} href={item.href} className="flex items-baseline justify-between gap-2.5 rounded px-1 py-[7px] hover:bg-card-hover hover:no-underline">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{item.tag}</span>
                    </PanelLink>
                  ))}
                  {!searchHits(items).length && <div className="px-1 pb-2.5 pt-1.5 text-[13px] text-muted-foreground">No results were found</div>}
                </div>
              ))}
              <div className="border-t border-border px-4 pb-3.5 pt-2.5">
                <Link to="/docs" className="text-[13px] text-muted-foreground hover:text-foreground">
                  REST API
                </Link>
              </div>
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center">
          <div className="relative" ref={bellMenu}>
            <button
              type="button"
              className={iconButton + " group"}
              onClick={() => {
                setBellOpen(!bellOpen);
                setUserOpen(false);
              }}
            >
              <span className="relative block h-5 w-5">
                <Bell size={20} />
                {unread && (
                  <span className="absolute -right-1.5 -top-[5px] h-3.5 min-w-[14px] rounded-full bg-[#ed4245] px-[3px] text-center text-[9px] font-bold leading-[14px] text-white shadow-[0_0_0_2px_oklch(var(--header))] group-hover:shadow-[0_0_0_2px_oklch(var(--card-hover))]">
                    1
                  </span>
                )}
              </span>
            </button>
            {bellOpen && (
              <div className="drop w-80">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-3 text-sm font-semibold">
                  Notifications <span className="text-xs font-medium text-muted-foreground">{unread ? "1 unread" : "0 unread"}</span>
                </div>
                <Link
                  to="/notifications"
                  className="block border-b border-border px-3.5 py-3 hover:bg-card-hover hover:no-underline"
                  onClick={() => {
                    localStorage.setItem("notifications.rework", "1");
                    setUnread(false);
                  }}
                >
                  <div className="mb-0.5 font-semibold">Binwoken rework released</div>
                  <div className="mt-1 text-[11px] text-[oklch(52%_0.005_250)]">Nov 10, 2026</div>
                </Link>
                <Link to="/notifications" className="block px-3.5 py-3 text-center text-[13px] font-semibold hover:bg-card-hover hover:no-underline">
                  View all notifications
                </Link>
              </div>
            )}
          </div>
          <a href="https://discord.gg/RzGnytNDRR" target="_blank" rel="noopener" className={iconButton}>
            <HelpCircle size={20} />
          </a>
          <div className="relative" ref={userMenu}>
            <button
              type="button"
              className={iconButton}
              onClick={() => {
                setUserOpen(!userOpen);
                setBellOpen(false);
              }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-border text-[11px] font-semibold">{initials}</span>
            </button>
            {userOpen && user && (
              <div className="drop w-60 p-1">
                <div className="mb-1 flex items-center gap-2.5 border-b border-border px-2.5 pb-3 pt-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-border text-xs font-semibold">{initials}</span>
                  <div>
                    <div className="text-sm font-semibold">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{user.credits} credits</div>
                  </div>
                </div>
                <Link to="/settings" className={userLink}>
                  <UserIcon />
                  Account settings
                </Link>
                <Link to="/docs" className={userLink}>
                  <Code2 />
                  Docs
                </Link>
                <Link to="/billing" className={userLink}>
                  <CreditCard />
                  Billing
                </Link>
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  className={userLink + " border-0 bg-transparent text-[#ed4245] [&>svg]:text-[#ed4245]"}
                  onClick={() => api.logout().then(() => navigate("/signin"))}
                >
                  <LogOut />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={"fixed inset-0 z-[110] bg-black/45 transition-opacity duration-200 ease-binwoken " + (navOpen ? "opacity-100" : "pointer-events-none opacity-0")} onClick={() => setNavOpen(false)} />

      <nav
        aria-label="Console navigation"
        style={{ width: drawerWidth }}
        className={
          "fixed bottom-0 left-0 top-0 z-[120] grid grid-cols-[200px_minmax(0,1fr)] border-r border-border bg-header shadow-[8px_0_32px_rgba(0,0,0,0.35)] transition-[transform,width] duration-[280ms] ease-binwoken max-md:!w-[min(360px,100vw)] max-md:grid-cols-1 " +
          (navOpen ? "translate-x-0" : "pointer-events-none -translate-x-[104%]")
        }
      >
        <div className={"flex min-h-0 flex-col overflow-y-auto border-r border-border pb-4 pt-2 " + (mobilePanel ? "max-md:hidden" : "")}>
          <div className="mb-1.5 border-b border-border px-3.5 pb-3.5 pt-2.5">
            <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-search px-2.5">
              <Search size={14} className="shrink-0 text-muted-foreground" />
              <input type="search" placeholder="Search" autoComplete="off" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none" value={navFilter} onChange={(event) => setNavFilter(event.target.value)} />
            </div>
          </div>
          {visibleCategories.map((cat) =>
            cat.id === "downloads" ? (
              <Link
                key={cat.id}
                to="/"
                className="flex w-full items-center justify-between gap-2 px-4 py-[9px] text-left text-muted-foreground hover:bg-card-hover hover:text-foreground hover:no-underline"
                onClick={() => setNavOpen(false)}
              >
                {cat.label}
                <ChevronRight size={12} className="opacity-55" />
              </Link>
            ) : (
              <button
                type="button"
                key={cat.id}
                className={
                  "flex w-full items-center justify-between gap-2 border-0 bg-transparent px-4 py-[9px] text-left hover:bg-card-hover hover:text-foreground " +
                  (navCategory === cat.id ? "bg-card-hover font-semibold text-foreground shadow-[inset_2px_0_0_oklch(var(--primary))]" : "text-muted-foreground")
                }
                onClick={() => {
                  setNavCategory(cat.id);
                  setMobilePanel(true);
                }}
              >
                {cat.label}
                <ChevronRight size={12} className="opacity-55" />
              </button>
            ),
          )}
        </div>
        <div className={"grid min-w-0 gap-7 overflow-auto px-[22px] pb-6 pt-[18px] max-md:grid-cols-1 max-md:gap-5 " + (panelCols.length > 1 ? "grid-cols-2 " : "grid-cols-1 ") + (mobilePanel ? "" : "max-md:hidden")}>
          {panelCols.map((col) => (
            <div key={col.title}>
              <h3 className="mb-2.5 text-[13px] font-semibold tracking-[-0.01em] text-muted-foreground">{col.title}</h3>
              {col.links.map((link) => (
                <PanelLink key={link.label} href={link.href} className="block py-1.5 text-sm">
                  {link.label}
                  {link.meta && <span className="mt-px block text-xs text-muted-foreground">{link.meta}</span>}
                </PanelLink>
              ))}
            </div>
          ))}
        </div>
      </nav>

      <Outlet context={{ openFinder, user, setUser }} />
      {finder && <Finder key={finder} id={finder} onClose={() => setFinder(null)} />}

      <footer className="fixed bottom-0 left-0 right-0 z-[21] flex h-10 items-center justify-end border-t border-border bg-footer px-5 text-xs text-muted-foreground">
        <div>Copyright © 2026, Binwoken and/or its affiliates. All rights reserved.</div>
      </footer>
    </>
  );
}
