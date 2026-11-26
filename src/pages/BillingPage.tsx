import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api, Usage, User } from "../api";

export default function BillingPage() {
  const { user, setUser } = useOutletContext<{ user: User | null; setUser: (user: User) => void }>();
  const [usage, setUsage] = useState<Usage[]>([]);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== "visible") return;
      api.me().then(setUser);
      api.usage().then(setUsage);
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
    user && (
      <main className="page-center">
        <section className="panel mb-3.5 p-4 pb-5">
          <div className="mb-3.5 text-base font-semibold tracking-tight">Credits</div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-3xl font-bold tracking-tight">{user.credits}</div>
              <div className="text-xs text-muted-foreground">Available balance</div>
            </div>
            <a href="https://discord.gg/RzGnytNDRR" target="_blank" rel="noopener" className="btn-dark hover:no-underline">
              Buy credits
            </a>
          </div>
        </section>
        <section className="panel p-4 pb-5">
          <div className="mb-3.5 text-base font-semibold tracking-tight">Usage</div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 font-semibold">When</th>
                <th className="py-2 font-semibold">Description</th>
                <th className="py-2 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {usage.filter((row) => row.amount).map((row) => (
                <tr key={row.description + row.created} className="border-b border-border last:border-0">
                  <td className="py-3">{new Date(row.created * 1000).toLocaleString()}</td>
                  <td className="py-3">{row.description}</td>
                  <td className="py-3">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    )
  );
}
