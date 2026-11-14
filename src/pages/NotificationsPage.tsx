import { useState } from "react";

const categories = [
  { id: "announcements", label: "Announcements", meta: "All unread" },
  { id: "billing", label: "Billing", meta: "Plan and quota" },
  { id: "actions", label: "Actions", meta: "Required actions" },
  { id: "other", label: "Other", meta: "Informational" },
];

export default function NotificationsPage() {
  const [category, setCategory] = useState("announcements");
  const [unread, setUnread] = useState(() => !localStorage.getItem("notifications.rework"));
  const counts = { announcements: unread ? 1 : 0, billing: 0, actions: 0, other: 0 };

  return (
    <main className="page-center">
      <div className="mb-4 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        {categories.map((categoryItem) => (
          <button key={categoryItem.id} type="button" className={"panel p-3 text-left hover:bg-card-hover " + (category === categoryItem.id ? "ring-1 ring-muted-foreground/40" : "")} onClick={() => setCategory(categoryItem.id)}>
            <div className="font-semibold">{categoryItem.label}</div>
            <div className="text-xs text-muted-foreground">{categoryItem.meta}</div>
            <div className="mt-2 text-2xl font-bold">{counts[categoryItem.id]}</div>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <span className="font-semibold">{categories.find((categoryItem) => categoryItem.id === category).label}</span>
          {category === "announcements" && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                localStorage.setItem("notifications.rework", "1");
                setUnread(false);
                window.dispatchEvent(new Event("notifications-changed"));
              }}
            >
              Mark all as read
            </button>
          )}
        </div>
        {category === "announcements" && (
          <div
            className={"grid cursor-pointer grid-cols-[auto_1fr_auto] gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-card-hover " + (unread ? "" : "opacity-70")}
            onClick={() => {
              localStorage.setItem("notifications.rework", "1");
              setUnread(false);
              window.dispatchEvent(new Event("notifications-changed"));
            }}
          >
            <span className={"mt-2 h-2 w-2 rounded-full " + (unread ? "bg-accent" : "bg-transparent")} />
            <div className="font-semibold">Binwoken rework released</div>
            <time className="whitespace-nowrap text-xs text-muted-foreground">Nov 10, 2026</time>
          </div>
        )}
      </section>
    </main>
  );
}
