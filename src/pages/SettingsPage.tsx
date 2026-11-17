import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { X } from "lucide-react";
import { api, User } from "../api";

const row = "grid grid-cols-[120px_minmax(0,1fr)_88px] items-center gap-3 py-3 max-sm:grid-cols-1 max-sm:[&>button]:justify-self-start max-sm:[&>a]:justify-self-start [&>button]:justify-self-end [&>a]:justify-self-end";

export default function SettingsPage() {
  const { user, setUser } = useOutletContext<{ user: User | null; setUser: (user: User) => void }>();
  const [revealed, setRevealed] = useState(false);
  const [modal, setModal] = useState<"name" | "email" | "password" | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [result, setResult] = useState("");

  const saveName = () =>
    api.resetName(firstName, lastName).then(() => {
      setUser({ ...user!, first_name: firstName, last_name: lastName });
      setModal(null);
    });

  const saveEmail = () =>
    api.resetEmail(email).then(() => {
      setUser({ ...user!, email });
      setModal(null);
    });

  const savePassword = () =>
    api.resetPassword(oldPassword, newPassword).then(({ status, body }) => {
      if (status === 400) {
        setResult(body.message);
        return;
      }
      setOldPassword("");
      setNewPassword("");
      setModal(null);
    });

  return (
    user && (
      <>
        <main className="page-center">
          <section className="panel mb-3.5 p-4 pb-5">
            <div className="mb-3.5 text-base font-semibold tracking-tight">Profile</div>
            <div className={row + " border-b border-border"}>
              <div className="text-xs font-semibold text-muted-foreground">Display name</div>
              <div>{user.first_name + " " + user.last_name}</div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setFirstName(user.first_name);
                  setLastName(user.last_name);
                  setModal("name");
                }}
              >
                Edit
              </button>
            </div>
            <div className={row + " border-b border-border"}>
              <div className="text-xs font-semibold text-muted-foreground">Email</div>
              <div>{user.email}</div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setEmail(user.email);
                  setModal("email");
                }}
              >
                Edit
              </button>
            </div>
            <div className={row + " border-b border-border"}>
              <div className="text-xs font-semibold text-muted-foreground">Password</div>
              <div className="font-mono text-[13px]">••••••••</div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setOldPassword("");
                  setNewPassword("");
                  setResult("");
                  setModal("password");
                }}
              >
                Reset
              </button>
            </div>
            <div className={row}>
              <div className="text-xs font-semibold text-muted-foreground">Credits</div>
              <div>{user.credits}</div>
              <Link to="/billing" className="btn-ghost hover:no-underline">
                Manage
              </Link>
            </div>
          </section>
          <section className="panel mb-3.5 p-4 pb-5">
            <div className="mb-3.5 text-base font-semibold tracking-tight">API key</div>
            <label htmlFor="api-key" className="mb-1.5 block text-[13px] font-semibold">
              Bearer token
            </label>
            <input
              id="api-key"
              type="text"
              readOnly
              value={revealed ? user.key : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
              className="mb-3.5 h-9 w-full rounded-md border border-border bg-search px-3 font-mono text-[13px] outline-none"
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost" onClick={() => setRevealed(!revealed)}>
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(user.key)}>
                Copy
              </button>
              <button
                type="button"
                className="btn-dark"
                onClick={() => api.rotateKey().then((row) => setUser({ ...user, key: row.key }))}
              >
                Rotate key
              </button>
            </div>
          </section>
          <section className="panel p-4 pb-5">
            <div className="mb-3.5 text-base font-semibold tracking-tight">Preferences</div>
            <label htmlFor="region" className="mb-1.5 block text-[13px] font-semibold text-muted-foreground">
              Default region
            </label>
            <input id="region" type="text" disabled value="GB (London)" className="field cursor-not-allowed opacity-50" />
          </section>
        </main>
        {modal === "name" && (
          <div className="modal-scrim" onClick={() => setModal(null)}>
            <div className="modal w-[min(440px,100%)]" onClick={(event) => event.stopPropagation()}>
              <div className="relative px-[18px] pb-5 pt-4">
                <button type="button" aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={() => setModal(null)}>
                  <X size={18} />
                </button>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Profile</div>
                <h2 className="mb-4 pr-8 text-[22px] font-bold tracking-[-0.03em]">Edit name</h2>
                <label className="mb-1.5 block text-[13px] font-semibold">First name</label>
                <input type="text" className="field mb-3.5 h-9 w-full" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                <label className="mb-1.5 block text-[13px] font-semibold">Last name</label>
                <input type="text" className="field mb-3.5 h-9 w-full" value={lastName} onChange={(event) => setLastName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveName()} />
                <button type="button" className="btn-dark h-9 w-full" onClick={saveName}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        {modal === "email" && (
          <div className="modal-scrim" onClick={() => setModal(null)}>
            <div className="modal w-[min(440px,100%)]" onClick={(event) => event.stopPropagation()}>
              <div className="relative px-[18px] pb-5 pt-4">
                <button type="button" aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={() => setModal(null)}>
                  <X size={18} />
                </button>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Profile</div>
                <h2 className="mb-4 pr-8 text-[22px] font-bold tracking-[-0.03em]">Edit email</h2>
                <label className="mb-1.5 block text-[13px] font-semibold">Email</label>
                <input type="email" className="field mb-3.5 h-9 w-full" value={email} onChange={(event) => setEmail(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveEmail()} />
                <button type="button" className="btn-dark h-9 w-full" onClick={saveEmail}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
        {modal === "password" && (
          <div className="modal-scrim" onClick={() => setModal(null)}>
            <div className="modal w-[min(440px,100%)]" onClick={(event) => event.stopPropagation()}>
              <div className="relative px-[18px] pb-5 pt-4">
                <button type="button" aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card-hover hover:text-foreground" onClick={() => setModal(null)}>
                  <X size={18} />
                </button>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Profile</div>
                <h2 className="mb-4 pr-8 text-[22px] font-bold tracking-[-0.03em]">Reset password</h2>
                <label className="mb-1.5 block text-[13px] font-semibold">Current password</label>
                <input type="password" className="field mb-3.5 h-9 w-full" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} />
                <label className="mb-1.5 block text-[13px] font-semibold">New password</label>
                <input type="password" className="field mb-3.5 h-9 w-full" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && savePassword()} />
                {result && <p className="mb-3.5 text-[13px] text-muted-foreground">{result}</p>}
                <button type="button" className="btn-dark h-9 w-full" onClick={savePassword}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  );
}
