import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, LayoutGrid, MoreHorizontal, Search } from "lucide-react";
import CheckBox from "../CheckBox";
import { api, Instance } from "../api";

const tabs = [
  { id: "details", label: "Details" },
  { id: "targets", label: "Targets" },
];

const menuItemClass = "block w-full px-3 py-2 text-left text-sm hover:bg-card-hover";

export default function InstancesPage() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [active, setActive] = useState(window.location.hash.slice(1) || "");
  const [tab, setTab] = useState("details");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [menu, setMenu] = useState("");
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [url, setUrl] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [guilds, setGuilds] = useState<string[]>([]);
  const [userInput, setUserInput] = useState("");
  const [guildInput, setGuildInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const selected = instances.find((row) => String(row.id) === active);
  const row = instances.find((item) => String(item.id) === menu);
  const shown = instances.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const current = Math.min(page, pages);
  const start = (current - 1) * perPage;
  const rows = shown.slice(start, start + perPage);
  const from = shown.length ? start + 1 : 0;
  const to = Math.min(start + perPage, shown.length);

  useEffect(() => {
    api.instances().then(setInstances);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setUrl(selected.url);
    setUsers(selected.users);
    setGuilds(selected.guilds);
    setUserInput("");
    setGuildInput("");
    setUrlError("");
  }, [selected?.id]);

  const dirty =
    !!selected &&
    (url.trim() !== selected.url || JSON.stringify(users) !== JSON.stringify(selected.users) || JSON.stringify(guilds) !== JSON.stringify(selected.guilds));

  const save = () => {
    const body = { url: url.trim(), users, guilds };
    api.editInstance(selected.id, body).then((row) => {
      if (row.message) {
        setUrlError(row.message);
        return;
      }
      setUrlError("");
      setInstances(instances.map((item) => (item.id === selected.id ? { ...item, ...body } : item)));
    });
  };

  if (selected) {
    return (
      <>
        <main className={"page-fade px-8 pt-5 max-sm:px-4 " + (dirty ? "pb-28" : "pb-12")}>
          <a href="/instances" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground hover:no-underline" onClick={() => setActive("")}>
            ← Instances
          </a>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="m-0 text-[28px] font-bold">{selected.name}</h1>
              <div className="text-sm text-muted-foreground">
                {selected.shape}
              </div>
            </div>
            <div className="relative">
              <button type="button" className="btn-ghost" onClick={() => setMenu(menu === "actions" ? "" : "actions")}>
                Actions
                <ChevronDown size={14} strokeWidth={2.25} className={"shrink-0 transition-transform duration-150 ease-out " + (menu === "actions" ? "rotate-180" : "")} />
              </button>
              {menu === "actions" && (
                <div className="drop min-w-[140px] py-1">
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      api.startInstance(selected.id).then(() => {
                        setInstances(instances.map((item) => (item.id === selected.id ? { ...item, state: "Running" } : item)));
                        setMenu("");
                        window.dispatchEvent(new Event("user-changed"));
                      });
                    }}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    className={menuItemClass}
                    onClick={() => {
                      api.stopInstance(selected.id).then(() => {
                        setInstances(instances.map((item) => (item.id === selected.id ? { ...item, state: "Stopped" } : item)));
                        setMenu("");
                      });
                    }}
                  >
                    Stop
                  </button>
                  <button type="button" className={menuItemClass + " text-[#ed4245]"} onClick={() => setDeleteOpen(true)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mb-4 flex flex-wrap gap-1">
            {tabs.map((item) => (
              <a key={item.id} href={"#" + selected.id} className={"border-0 bg-transparent px-3 py-2 text-sm hover:no-underline " + (tab === item.id ? "border-b-2 border-primary font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setTab(item.id)}>
                {item.label}
              </a>
            ))}
          </div>
          {tab === "details" ? (
            <div className="grid grid-cols-2 gap-8 max-md:grid-cols-1">
              <div>
                <h2 className="mb-3 text-base font-bold">General</h2>
                <div className="mb-3 text-sm">
                  <div className="font-semibold">Instance ID</div>
                  <div>{selected.id}</div>
                </div>
                <div className="mb-3 text-sm">
                  <div className="font-semibold">Created</div>
                  <div>{new Date(selected.created * 1000).toUTCString()}</div>
                </div>
                <div className="mb-3 text-sm">
                  <div className="font-semibold">State</div>
                  <div>{selected.state}</div>
                </div>
              </div>
              <div>
                <h2 className="mb-3 text-base font-bold">Webhook</h2>
                <div className="mb-3 text-sm">
                  <div className="mb-1.5 font-semibold">URL</div>
                  <input
                    type="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setUrlError("");
                    }}
                    className={"h-9 w-full rounded-md border bg-search px-3 outline-none " + (urlError ? "border-[#ed4245]" : "border-border")}
                  />
                  {urlError && <div className="mt-1.5 text-sm text-[#ed4245]">{urlError}</div>}
                </div>
                <div className="mb-3 text-sm">
                  <div className="font-semibold">Type</div>
                  <div>{selected.type[0].toUpperCase() + selected.type.slice(1)}</div>
                </div>
                <div className="mb-3 text-sm">
                  <div className="font-semibold">Credits</div>
                  <div>{selected.credits}/day</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <h2 className="mb-3 text-base font-bold">Targets</h2>
              <label htmlFor="user-id" className="mb-1.5 block font-semibold">
                User ID <span className="font-normal text-muted-foreground">{users.length} / {selected.slots}</span>
              </label>
              <div className="mb-3 flex gap-2">
                <input
                  id="user-id"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter user ID"
                  value={userInput}
                  onChange={(event) => setUserInput(event.target.value.replace(/[^0-9]/g, ""))}
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-search px-3 outline-none"
                />
                <button
                  type="button"
                  className="btn-dark"
                  onClick={() => {
                    setUsers([...users, userInput]);
                    setUserInput("");
                  }}
                >
                  Add
                </button>
              </div>
              <div className="mb-6 flex flex-col gap-2">
                {users.map((userId) => (
                  <div key={userId} className="flex items-center justify-between rounded-md border border-border bg-search px-3 py-2.5">
                    <span className="font-mono text-[13px]">{userId}</span>
                    <button type="button" className="border-0 bg-transparent font-medium text-[#ed4245]" onClick={() => setUsers(users.filter((current) => current !== userId))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <label htmlFor="guild-name" className="mb-1.5 block font-semibold">
                Guild name <span className="font-normal text-muted-foreground">{guilds.length} / {selected.slots}</span>
              </label>
              <div className="mb-3 flex gap-2">
                <input
                  id="guild-name"
                  type="text"
                  placeholder="Enter guild name"
                  value={guildInput}
                  onChange={(event) => setGuildInput(event.target.value)}
                  className="h-9 min-w-0 flex-1 rounded-md border border-border bg-search px-3 outline-none"
                />
                <button
                  type="button"
                  className="btn-dark"
                  onClick={() => {
                    setGuilds([...guilds, guildInput]);
                    setGuildInput("");
                  }}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {guilds.map((guild) => (
                  <div key={guild} className="flex items-center justify-between rounded-md border border-border bg-search px-3 py-2.5">
                    <span className="font-mono text-[13px]">{guild}</span>
                    <button type="button" className="border-0 bg-transparent font-medium text-[#ed4245]" onClick={() => setGuilds(guilds.filter((current) => current !== guild))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        {dirty && (
          <div className="fixed bottom-10 left-0 right-0 z-20 border-t border-border bg-header px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="m-0 text-sm text-muted-foreground">You have unsaved changes.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setUrl(selected.url);
                    setUsers(selected.users);
                    setGuilds(selected.guilds);
                    setUrlError("");
                  }}
                >
                  Discard
                </button>
                <button type="button" className="btn-dark" onClick={save}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteOpen && (
          <div className="modal-scrim" onClick={() => setDeleteOpen(false)}>
            <div className="modal w-[min(520px,100%)]" onClick={(event) => event.stopPropagation()}>
              <div className="border-b border-border px-4 py-3.5 font-semibold">Delete instance</div>
              <div className="px-4 py-4 text-sm">
                <p>This permanently deletes the selected instance and its targets. This cannot be undone.</p>
              </div>
              <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                <button type="button" className="btn-ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-ghost text-[#ed4245]"
                  onClick={() => {
                    api.deleteInstance(selected.id).then(() => {
                      setInstances(instances.filter((item) => item.id !== selected.id));
                      setActive("");
                      setMenu("");
                      setDeleteOpen(false);
                    });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <main className="page-fade px-8 pb-12 pt-5 max-sm:px-4">
        <h1 className="m-0 text-[28px] font-bold tracking-tight">Webhooks</h1>
        <div className="my-4 flex h-9 min-w-[200px] items-center gap-2 rounded-md border border-border bg-card px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            placeholder="Search instances"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 border-0 bg-transparent outline-none"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn-dark" onClick={() => navigate("/create")}>
            Create instance
          </button>
          <div className="relative">
            <button type="button" className="btn-ghost" onClick={() => setMenu(menu === "actions" ? "" : "actions")}>
              Actions
              <ChevronDown size={14} strokeWidth={2.25} className={"shrink-0 transition-transform duration-150 ease-out " + (menu === "actions" ? "rotate-180" : "")} />
            </button>
            {menu === "actions" && (
              <div className="drop left-0 right-auto origin-top-left min-w-[140px] py-1">
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    Promise.all(checked.map((id) => api.startInstance(Number(id)))).then(() => {
                      setInstances(instances.map((item) => (checked.includes(String(item.id)) ? { ...item, state: "Running" } : item)));
                      setMenu("");
                      window.dispatchEvent(new Event("user-changed"));
                    });
                  }}
                >
                  Start
                </button>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    Promise.all(checked.map((id) => api.stopInstance(Number(id)))).then(() => {
                      setInstances(instances.map((item) => (checked.includes(String(item.id)) ? { ...item, state: "Stopped" } : item)));
                      setMenu("");
                    });
                  }}
                >
                  Stop
                </button>
                <button type="button" className={menuItemClass + " text-[#ed4245]"} onClick={() => setDeleteOpen(true)}>
                  Delete
                </button>
              </div>
            )}
          </div>
          <span className="flex-1" />
          <button type="button" aria-label="Manage columns" className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-card-hover">
            <LayoutGrid size={18} />
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-muted-foreground">
                <th className="w-10 p-2 text-center">
                  <CheckBox checked={shown.length > 0 && checked.length === shown.length} onChange={(next) => setChecked(next ? shown.map((item) => String(item.id)) : [])} />
                </th>
                <th className="p-2">Name</th>
                <th className="p-2 text-center">State</th>
                <th className="p-2 text-center">Targets</th>
                <th className="p-2 text-center">Webhook</th>
                <th className="p-2 text-center">Shape</th>
                <th className="p-2 text-center">Credits</th>
                <th className="p-2 text-center">Created</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                  <td className="p-2 text-center">
                    <CheckBox checked={checked.includes(String(item.id))} onChange={(next) => setChecked(next ? [...checked, String(item.id)] : checked.filter((id) => id !== String(item.id)))} />
                  </td>
                  <td className="p-2">
                    <a href={"#" + item.id} className="font-semibold hover:underline" onClick={() => setActive(String(item.id))}>
                      {item.name}
                    </a>
                  </td>
                  <td className="p-2 text-center">{item.state}</td>
                  <td className="p-2 text-center">
                    {item.users.length}/{item.slots} · {item.guilds.length}/{item.slots}
                  </td>
                  <td className="p-2 text-center">{item.type[0].toUpperCase() + item.type.slice(1)}</td>
                  <td className="p-2 text-center">{item.shape}</td>
                  <td className="p-2 text-center">{item.credits}/day</td>
                  <td className="p-2 text-center">{new Date(item.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      aria-label="More"
                      className="grid h-8 w-8 place-items-center rounded-md hover:bg-card-hover"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                        setMenu(menu === String(item.id) ? "" : String(item.id));
                      }}
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
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
      {row &&
        !deleteOpen &&
        createPortal(
          <div className="fixed z-[250] min-w-[120px] origin-top-right overflow-hidden rounded-lg border border-border bg-card py-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200" style={{ top: menuPos.top, right: menuPos.right }}>
            <button type="button" className={menuItemClass + " text-[#ed4245]"} onClick={() => setDeleteOpen(true)}>
              Delete
            </button>
          </div>,
          document.body,
        )}
      {deleteOpen && (
        <div className="modal-scrim" onClick={() => setDeleteOpen(false)}>
          <div className="modal w-[min(520px,100%)]" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-border px-4 py-3.5 font-semibold">Delete instance</div>
            <div className="px-4 py-4 text-sm">
              <p>This permanently deletes the selected instance and its targets. This cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <button type="button" className="btn-ghost" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-ghost text-[#ed4245]"
                onClick={() => {
                  const ids = checked.length ? checked : menu ? [menu] : [];
                  Promise.all(ids.map((id) => api.deleteInstance(Number(id)))).then(() => {
                    setInstances(instances.filter((item) => !ids.includes(String(item.id))));
                    setChecked([]);
                    setMenu("");
                    setDeleteOpen(false);
                  });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
