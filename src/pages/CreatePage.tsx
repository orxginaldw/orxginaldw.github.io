import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const shapes = [
  { slots: 1, minutes: 100, discord: 5, external: 10, discordName: "WH.Discord.1.100.5", externalName: "WH.External.1.100.10" },
  { slots: 3, minutes: 75, discord: 15, external: 30, discordName: "WH.Discord.3.75.15", externalName: "WH.External.3.75.30" },
  { slots: 5, minutes: 50, discord: 25, external: 50, discordName: "WH.Discord.5.50.25", externalName: "WH.External.5.50.50" },
  { slots: 8, minutes: 30, discord: 30, external: 60, discordName: "WH.Discord.8.30.30", externalName: "WH.External.8.30.60" },
  { slots: 10, minutes: 5, discord: 40, external: 80, discordName: "WH.Discord.10.5.40", externalName: "WH.External.10.5.80" },
];

const steps = ["Basic information", "Targets", "Review"];

const types = [
  { id: "discord", title: "Discord Webhook", text: "Posts an embed to your Discord channel." },
  { id: "external", title: "External Webhook", text: "POSTs JSON to your URL." },
];

const inputClass = "h-9 w-full rounded-md border border-border bg-search px-3 outline-none";
const tileClass = "rounded-md border border-border bg-search p-3.5";

export default function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `webhook-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  });
  const [url, setUrl] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [userInput, setUserInput] = useState("");
  const [guilds, setGuilds] = useState<string[]>([]);
  const [guildInput, setGuildInput] = useState("");
  const [type, setType] = useState("discord");
  const [shapeIndex, setShapeIndex] = useState(0);
  const [shapeOpen, setShapeOpen] = useState(false);
  const [pickIndex, setPickIndex] = useState(0);
  const [pickType, setPickType] = useState("discord");
  const [nameError, setNameError] = useState("");
  const [urlError, setUrlError] = useState("");
  const shape = shapes[shapeIndex];
  const shapePrice = (shapeRow, webhookType = type) => `${webhookType === "external" ? shapeRow.external : shapeRow.discord}/day`;
  const shapeName = (shapeRow, webhookType = type) => (webhookType === "external" ? shapeRow.externalName : shapeRow.discordName);

  const goNext = () => {
    if (step === 0) {
      const nextNameError = name.trim() ? "" : "This field is required.";
      let nextUrlError = "";
      if (!url.trim()) nextUrlError = "This field is required.";
      else if (type === "discord" && !url.trim().startsWith("https://discord.com/api/webhooks/")) nextUrlError = "Enter a valid Discord webhook URL.";
      else if (type === "external" && !url.trim().startsWith("https://")) nextUrlError = "Enter a valid HTTPS URL.";
      setNameError(nextNameError);
      setUrlError(nextUrlError);
      if (nextNameError || nextUrlError) return;
    }
    setNameError("");
    setUrlError("");
    if (step === steps.length - 1) {
      const credits = type === "external" ? shape.external : shape.discord;
      api
        .createInstance({
          name: name.trim(),
          url: url.trim(),
          type,
          shape: shapeName(shape),
          slots: shape.slots,
          minutes: shape.minutes,
          credits,
          users,
          guilds,
        })
        .then(() => {
          window.dispatchEvent(new Event("user-changed"));
          navigate("/instances");
        });
      return;
    }
    setStep(step + 1);
  };

  return (
    <>
      <main className="page-fade mx-auto w-[min(980px,calc(100%-64px))] px-8 py-7 pb-24">
        <h1 className="mb-5 text-[28px] font-bold tracking-tight">Create webhook</h1>
        {steps.slice(0, step).map((title, stepIndex) => (
          <button key={title} type="button" className="mb-2 flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-card-hover" onClick={() => setStep(stepIndex)}>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{stepIndex + 1}</span>
            <span className="font-medium">{title}</span>
          </button>
        ))}
        <section className="panel mb-4 p-5">
          <div className="mb-2 flex items-center gap-3">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{step + 1}</span>
            <h2 className="m-0 text-lg font-bold tracking-tight">{steps[step]}</h2>
          </div>
          {step === 0 && (
            <>
              <div className="mb-4">
                <label htmlFor="name" className="mb-1.5 block font-semibold">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameError("");
                  }}
                  className={inputClass + (nameError ? " border-[#ed4245]" : "")}
                />
                {nameError && <div className="mt-1.5 text-sm text-[#ed4245]">{nameError}</div>}
              </div>
              <div className="mb-4">
                <label htmlFor="url" className="mb-1.5 block font-semibold">
                  Webhook URL
                </label>
                <input
                  id="url"
                  type="url"
                  placeholder={type === "external" ? "https://example.com/webhook/..." : "https://discord.com/api/webhooks/..."}
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setUrlError("");
                  }}
                  className={inputClass + (urlError ? " border-[#ed4245]" : "")}
                />
                {urlError && <div className="mt-1.5 text-sm text-[#ed4245]">{urlError}</div>}
              </div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="m-0 text-[15px] font-bold">Shape</h3>
                <button
                  type="button"
                  className="btn-ghost h-8"
                  onClick={() => {
                    setPickIndex(shapeIndex);
                    setPickType(type);
                    setShapeOpen(true);
                  }}
                >
                  Change shape
                </button>
              </div>
              <div className={tileClass + " mb-3"}>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="mt-1 font-semibold">{shapeName(shape)}</div>
              </div>
              <div className={tileClass}>
                <div className="text-xs text-muted-foreground">Capacity</div>
                <div className="mt-1 font-semibold">
                  {users.length} / {shape.slots} users · {guilds.length} / {shape.slots} guilds
                </div>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <label htmlFor="user-id" className="mb-1.5 block font-semibold">
                User ID{" "}
                <span className="font-normal text-muted-foreground">
                  {users.length} / {shape.slots}
                </span>
              </label>
              <div className="mb-3 flex gap-2">
                <input
                  id="user-id"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter user ID"
                  value={userInput}
                  onChange={(event) => setUserInput(event.target.value.replace(/[^0-9]/g, ""))}
                  className={inputClass + " min-w-0 flex-1"}
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
                    <span>{userId}</span>
                    <button type="button" className="border-0 bg-transparent font-medium text-[#ed4245]" onClick={() => setUsers(users.filter((currentId) => currentId !== userId))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <label htmlFor="guild-name" className="mb-1.5 block font-semibold">
                Guild name{" "}
                <span className="font-normal text-muted-foreground">
                  {guilds.length} / {shape.slots}
                </span>
              </label>
              <div className="mb-3 flex gap-2">
                <input
                  id="guild-name"
                  type="text"
                  placeholder="Enter guild name"
                  value={guildInput}
                  onChange={(event) => setGuildInput(event.target.value)}
                  className={inputClass + " min-w-0 flex-1"}
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
                    <span>{guild}</span>
                    <button type="button" className="border-0 bg-transparent font-medium text-[#ed4245]" onClick={() => setGuilds(guilds.filter((current) => current !== guild))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div className={tileClass + " flex h-full flex-col"}>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="mt-1 font-semibold">{name}</div>
                  <div className="mt-auto pt-2 text-xs text-muted-foreground">{types.find((webhookType) => webhookType.id === type).title}</div>
                </div>
                <div className={tileClass + " flex h-full flex-col"}>
                  <div className="text-xs text-muted-foreground">Webhook URL</div>
                  <div className="mt-1 break-all font-semibold">{url}</div>
                </div>
                <div className={tileClass + " flex h-full flex-col"}>
                  <div className="text-xs text-muted-foreground">Shape</div>
                  <div className="mt-1 font-semibold">{shapeName(shape)}</div>
                  <div className="mt-auto pt-2">
                    <div className="text-xs text-muted-foreground">Cost: {shapePrice(shape)}</div>
                    <div className="text-xs text-muted-foreground">Search every: {shape.minutes} min</div>
                  </div>
                </div>
                <div className={tileClass + " flex h-full flex-col"}>
                  <div className="text-xs text-muted-foreground">Targets</div>
                  <div className="mt-1 font-semibold">
                    {users.length} / {shape.slots} users · {guilds.length} / {shape.slots} guilds
                  </div>
                  <div className="mt-auto pt-2 text-xs text-muted-foreground">
                    {[...users, ...guilds].join(", ")}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
        {steps.slice(step + 1).map((title, upcomingIndex) => (
          <div key={title} className="mb-2 flex items-center gap-3 rounded-md border border-border px-3 py-2 opacity-60">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-border text-xs font-bold">{step + 2 + upcomingIndex}</span>
            <span>{title}</span>
          </div>
        ))}
      </main>
      <div className="fixed bottom-10 left-0 right-0 z-20 border-t border-border bg-header px-6 py-3">
        <div className="mx-auto flex w-[min(980px,calc(100%-64px))] flex-wrap items-center justify-between gap-4">
          <div className="min-w-[200px] flex-1">
            <div className="mb-1 text-xs text-muted-foreground">
              Tasks Completed &nbsp; {step} of {steps.length}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-[width]" style={{ width: (step / steps.length) * 100 + "%" }} />
            </div>
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
                Previous
              </button>
            )}
            <button type="button" className="btn-dark" onClick={goNext}>
              {step === steps.length - 1 ? "Create" : "Next"}
            </button>
          </div>
        </div>
      </div>
      {shapeOpen && (
        <div className="modal-scrim" onClick={() => setShapeOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="border-b border-border px-4 py-3.5 font-semibold">Browse all shapes</div>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
              <div className="mb-2 text-sm font-semibold">Instance type</div>
              <div className="mb-4 grid grid-cols-2 gap-2 max-sm:grid-cols-1">
                {types.map((webhookType) => (
                  <button key={webhookType.id} type="button" className={"rounded-md border p-3 text-left " + (pickType === webhookType.id ? "border-accent ring-1 ring-accent" : "border-border")} onClick={() => setPickType(webhookType.id)}>
                    <div className="font-semibold">{webhookType.title}</div>
                    <div className="text-xs text-muted-foreground">{webhookType.text}</div>
                  </button>
                ))}
              </div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2">Shape name</th>
                    <th className="py-2">Target slots</th>
                    <th className="py-2">Search every (min)</th>
                    <th className="py-2">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {shapes.map((shapeRow, shapeRowIndex) => (
                    <tr key={shapeRow.slots} className={"cursor-pointer border-b border-border " + (pickIndex === shapeRowIndex ? "bg-card-hover" : "")} onClick={() => setPickIndex(shapeRowIndex)}>
                      <td className="py-2 font-medium">{shapeName(shapeRow, pickType)}</td>
                      <td className="py-2">{shapeRow.slots}</td>
                      <td className="py-2">{shapeRow.minutes}</td>
                      <td className="py-2">{shapePrice(shapeRow, pickType)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <button type="button" className="btn-ghost" onClick={() => setShapeOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-dark"
                onClick={() => {
                  setType(pickType);
                  setShapeIndex(pickIndex);
                  setUsers(users.slice(0, shapes[pickIndex].slots));
                  setGuilds(guilds.slice(0, shapes[pickIndex].slots));
                  setShapeOpen(false);
                }}
              >
                Select shape
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
