import { useState } from "react";
import { api } from "../api";

const rawBase = "https://raw.githubusercontent.com/orxginaldw/orxginaldw.github.io/refs/heads/main/downloads/";
const blobBase = "https://github.com/orxginaldw/orxginaldw.github.io/raw/refs/heads/main/downloads/";

const files = [
  { id: "lomastrap", type: "zip", title: "Lomastrap.zip", creator: "orxginaldw", added: "Nov 4th, 2026", description: "Cracked Lomastrap. Opens in developer mode with no login or access code.", url: blobBase + "Lomastrap.zip", external: true, image: "lomastrap" },
  { id: "lomastrap_decompiled", type: "zip", title: "Lomastrap Decompiled.zip", creator: "orxginaldw", added: "Nov 4th, 2026", description: "Decompiled Lomastrap Python source from the PyInstaller build.", url: blobBase + "Lomastrap%20Decompiled.zip", image: "lomastrap" },
  { id: "luma_mira_source", type: "7z", title: "Luma Mira Github", creator: "union3425", added: "Nov 2nd, 2026", description: "Full GitHub dump of Luma Mira source and more.", url: blobBase + "planetcatyt%20-%20github%20dump.7z" },
  { id: "luma_decompiled", type: "lua", title: "Luma Decompiled.lua", creator: "bulbiczek", added: "Nov 1st, 2026", description: "Luma's Deepwoken script, decompiled.", url: rawBase + "luma.lua" },
  { id: "katalyst_decompiled", type: "lua", title: "Katalyst Decompiled.lua", creator: "union3425", added: "Nov 1st, 2026", description: "Katalyst's Deepwoken script, decompiled.", url: rawBase + "final.lua" },
  { id: "merostrap_macro", type: "zip", title: "Merostrap.3.02.zip", creator: "orxginaldw", added: "Oct 22nd, 2026", description: "Patched Merostrap macro file. Context: made by <a href='https://www.youtube.com/channel/UCdsR1e3fcWrAe8A_oIVJfYQ' target='_blank' rel='noreferrer'>ammar</a>, a Deepwarden macro reskin sold for $25.", url: blobBase + "Merostrap.3.02.zip", external: true, image: "merostrapmacro" },
  { id: "merostrap_macro_source", type: "zip", title: "Merostrap.3.02 Source", creator: "orxginaldw", added: "Oct 22nd, 2026", description: "Source code for patched Merostrap.3.02.", url: blobBase + "Merostrap.3.02%20Source.zip", image: "merostrapmacro" },
  { id: "e_girl", type: "exe", title: "e-girl.exe", creator: "orxginaldw", added: "Aug 8th, 2026", description: "Tinder-style swipe app to find Deepwoken e-girls. This works by scanning user bio's for matching keywords in server lists. May require <a href='https://developer.microsoft.com/en-us/microsoft-edge/webview2/' target='_blank' rel='noreferrer'>WebView2</a> if it fails to open.", url: blobBase + "e-girl.exe", image: "egirl" },
  { id: "the_fml_macro", type: "exe", title: "The FML Macro", creator: "lordbelioo", added: "Jul 24th, 2026", description: "Python macro by kodak with Better Swingspeed, Always Feint, Auto Mantra Feint, and Auto Uppercut.", url: blobBase + "the_fml_macro.exe", image: "thefmlmacro" },
  { id: "the_fml_macro_decompiled", type: "py", title: "The FML Macro Decompiled", creator: "orxginaldw", added: "Jul 24th, 2026", description: "Source code for The FML Macro.", url: rawBase + "the_fml_macro_decompiled.py", image: "thefmlmacro" },
  { id: "cage_macro", type: "ahk", title: "cage macro.ahk", creator: "YunisMink", added: "Jun 19th, 2026", description: "AutoHotkey macro by wizzix, with vibecoded hold-M1, sprint M1, fast feint, roll parry, golden tongue, and parry bar macros.", url: rawBase + "cage%20macro.ahk", image: "cagemacro" },
  { id: "pistachio_cream_menu", type: "zip", title: "Pistachio Cream Menu", creator: "orxginaldw", added: "Apr 4th, 2026", description: "Modified version with the license check removed. In its current state most features barely work or are outright broken, the UI is the only reason its considered good.", url: blobBase + "PCM_PATCH.zip", image: "pistachiocreammenu" },
  { id: "pistachio_cream_menu_source", type: "zip", title: "Pistachio Cream Menu Source", creator: "orxginaldw", added: "Apr 4th, 2026", description: "Full Pistachio Cream Menu source code, untouched and unpatched.", url: blobBase + "PCM_SOURCE.zip", image: "pistachiocreammenu" },
  { id: "lycoris_auto_parry_timings", type: "json", title: "Lycoris Auto-Parry Timings", creator: "orxginaldw", added: "Apr 3rd, 2026", description: "These are dumped auto-parry timings from <a href='https://github.com/Blastbrean/Lycoris-Rewrite/' target='_blank' rel='noreferrer'>Lycoris-Rewrite</a> via syncing workspace timing data and merging patch diffs into one timings file.", url: rawBase + "timings.json" },
  { id: "merostrap", type: "zip", title: "Merostrap1.6.4.zip", creator: "orxginaldw", added: "Mar 29th, 2026", description: "Leaked Merostrap file. Context: <a href='https://www.tiktok.com/@akytoq' target='_blank' rel='noreferrer'>akyto</a> was selling a Frostrap reskin for $25.", url: blobBase + "Merostrap1.6.4.zip", external: true, image: "merostrap" },
  { id: "lightningreflexes", type: "ahk", title: "lightningreflexes.ahk", creator: "YunisMink", added: "Dec 8th, 2025", description: "Press F during M1 to feint.", url: rawBase + "lightningreflexes.ahk" },
  { id: "evil_macro", type: "zip", title: "evil_macro.zip", creator: "_desov", added: "Sep 16th, 2025", description: "AutoHotkey macro with hold-M1, green reinforce, golden tongue, and roll-parry macros.", url: blobBase + "evil_macro.zip", image: "evilmacro" },
  { id: "mimos_macro", type: "ahk", title: "mimo's macro.ahk", creator: "gucc1fly", added: "Sep 14th, 2025", description: "AutoHotkey macro by former Godseeker gucc1fly (also known as mimo or maciek_cink), with hold-M1 and golden tongue macros.", url: blobBase + "mimo%27s%20macro.ahk" },
  { id: "spamclick", type: "exe", title: "spamclick.exe", creator: "grap", added: "Sep 13th, 2025", description: "Compiled AutoHotkey hold-M1 macro by former Godseeker grap. If it asks for a password, enter anything (for example, 1) and keep submitting until the popup closes.", url: blobBase + "spamclick.exe" },
  { id: "spamclick_decompiled", type: "ahk", title: "spamclick-decompiled.ahk", creator: "orxginaldw", added: "Sep 13th, 2025", description: "Source code for spamclick.exe.", url: rawBase + "spamclick-decompiled.ahk" },
  { id: "gold_menu", type: "zip", title: "gold-menu-decompiled.zip", creator: "orxginaldw", added: "Sep 6th, 2025", description: "Python source code for a Deepwoken macro menu that bundles many macros from the creator's public uploads.", url: blobBase + "gold_menu_decompiled.zip", image: "goldmenu" },
  { id: "akai_exe", type: "exe", title: "akai4.3.exe", creator: "pendant", added: "Sep 5th, 2025", description: "Popular AutoHotkey macro built for older Deepwoken UI; many macros no longer work as expected.", url: blobBase + "Officer.zip", image: "akai" },
  { id: "akai_patched", type: "zip", title: "akai4.3-patched.zip", creator: "orxginaldw", added: "Sep 6th, 2025", description: "Bypasses the Akai 4.3 license check.", url: blobBase + "Officer-patched.zip", image: "akai" },
  { id: "akai_decompiled", type: "zip", title: "akai4.3-decompiled.zip", creator: "orxginaldw", added: "Sep 6th, 2025", description: "Full Akai 4.3 source code, untouched and unpatched.", url: blobBase + "Officer-decompiled.zip", image: "akai" },
  { id: "client_appsettings", type: "json", title: "ClientAppSettings.json", creator: "reddice", added: "Sep 6th, 2025", description: "Leaked fflags from a Godseeker known as mervonz, or so I was told (slightly edited by me and reddice).", url: rawBase + "ClientAppSettings.json" },
  { id: "pawstrap", type: "exe", title: "Pawstrap, Deprecated", creator: "orxginaldw", added: "Oct 30th, 2026", description: "Fully cracked. Skips login so you do not need an account. If this stops working, I will not fix it because Pawstrap is too unpopular for me to care, almost no one uses it anyway, and Merostrap is better.", url: blobBase + "Patch.exe", image: "pawstrap" },
  { id: "binwoken", type: "exe", title: "Binwoken.exe, Deprecated", creator: "orxginaldw", added: "Aug 18th, 2026", description: "Restores the old Deepwoken server list so you can see and join every server. After the Chaos update the in-game list hides or buries a lot of servers based on your PvP score. You must be on <a href='https://offsets.imtheo.lol/docs/live-channel' target='_blank' rel='noreferrer'>Roblox Live Version</a> for it to work. API key required — generate it from Settings.", url: blobBase + "Binwoken.exe", image: "binwoken" },
  { id: "hamsternal_decompiled", type: "lua", title: "HamsternalDecompiled.lua, Deprecated", creator: "orxginaldw", added: "Apr 2nd, 2026", description: "Hamsternal's Deepwoken plugin script, decompiled from version 1.0.7. I discontinued decompiling further versions because I have made up with the owners. Obfuscation method is repeating-key XOR.", url: rawBase + "main.lua" },
  { id: "hamsternal_patched", type: "zip", title: "HamsternalPatch.zip, Deprecated", creator: "orxginaldw", added: "Mar 19th, 2026", description: "Hamsternal is a Deepwoken external with features like voiding mobs, no fall, fly, and a Lua scripting API, and it costs about $5. This zip includes a program that downloads the latest version, launches it with a bypassed whitelist, and lets you use it for free. If this gets patched, I will stop cracking it because I have made up with the owners.", url: blobBase + "HamsternalPatch.zip", external: true, image: "hamsternal" },
  { id: "evolution", type: "zip", title: "evolution.zip, Deprecated", creator: "orxginaldw", added: "Sep 18th, 2025", description: "AutoHotkey macro with a C++ ImGui backend that bundles public macros from popular YouTubers and Godseekers into one open-source menu. It also has OCR profile switching that auto-detects character slots for different build settings. This project is discontinued.", url: "https://www.evolutionary.site/", external: true, image: "evolution" },
  { id: "astral", type: "zip", title: "astral_client.zip, Deprecated", creator: "orxginaldw", added: "Aug 11th, 2025", description: "Formerly known as Kintama Macro, now rebranded as Astral Client. It was known for a build stealer and a username-based server finder. The build stealer could capture pre-shrine and post-shrine stats, talents, and oath into a deepwoken.co/builder link, while the server finder could locate a target's server and luminant from the main menu. This project is discontinued.", url: "https://astralclient.cc", external: true, image: "astralclient" },
];

const tracked = new Set(JSON.parse(localStorage.getItem("count") || "[]") as string[]);

export default function DownloadsPage() {
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const shown = files.filter((file) => (file.title + " " + file.creator).toLowerCase().includes(query.trim().toLowerCase()));

  const download = (file: (typeof files)[number]) => {
    if (!tracked.has(file.id)) {
      api.bump(file.id);
      tracked.add(file.id);
      localStorage.setItem("count", JSON.stringify([...tracked]));
    }
  };

  return (
    <>
      <main className="page-fade mx-auto w-[min(1400px,calc(100%-64px))] py-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="m-0 text-sm text-muted-foreground">
            Showing <b className="font-semibold text-accent">{shown.length}</b> (of <b className="font-semibold text-accent">{files.length}</b> total) patches
          </p>
          <input
            type="text"
            placeholder="Search by title or creator"
            autoComplete="off"
            spellCheck={false}
            className="field h-9 w-full max-w-[320px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
    </div>
        <div className="panel overflow-hidden">
          {shown.map((file) => (
            <article
              key={file.title}
              className="grid min-h-[200px] grid-cols-[180px_minmax(0,1fr)] gap-5 border-b border-border px-5 py-5 last:border-0 max-sm:min-h-0 max-sm:grid-cols-[112px_minmax(0,1fr)] max-sm:gap-3 max-sm:px-3 max-sm:py-3"
            >
              <button
                type="button"
                className={"relative grid h-[180px] w-[180px] place-items-center overflow-hidden rounded-md border border-border bg-code p-0 max-sm:h-28 max-sm:w-28 " + (file.image ? "cursor-pointer hover:border-muted-foreground/40" : "cursor-default")}
                onClick={() => file.image && setPreview(file.image)}
              >
                {file.image ? (
                  <img src={"/images/" + file.image + ".png"} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <img src={"/images/" + file.type + ".png"} alt="" className="h-16 w-16 object-contain" />
                )}
                <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded bg-background/90 px-1.5 py-1 ring-1 ring-border">
                  <img src="/images/windows.png" alt="" className="h-[18px] w-[18px] shrink-0 object-contain" />
                  <img src={"/images/" + file.type + ".png"} alt="" className="h-6 w-6 shrink-0 object-contain" />
                </span>
              </button>
              <div className="flex min-w-0 flex-col">
                <h2 className="m-0 text-[22px] font-bold leading-snug tracking-tight text-accent max-sm:text-[16px]">{file.title}</h2>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-[22px] items-center rounded bg-code px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{file.added}</span>
                  <span className="text-xs text-muted-foreground">by {file.creator}</span>
      </div>
                <p className="m-0 mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-muted-foreground [&_a]:text-accent [&_a]:underline" dangerouslySetInnerHTML={{ __html: file.description }} />
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <a href={file.url} target={file.external ? "_blank" : undefined} rel="noopener" className="btn-dark h-8 w-fit px-3.5 text-xs hover:no-underline" onClick={() => download(file)}>
                    Download
                  </a>
      </div>
    </div>
            </article>
          ))}
      </div>
      </main>
      {preview && (
        <div className="modal-scrim" onClick={() => setPreview(null)}>
          <img src={"/images/" + preview + ".png"} alt="" className="max-h-[90vh] max-w-[min(960px,100%)] rounded-lg border border-border bg-code object-contain" onClick={(event) => event.stopPropagation()} />
    </div>
      )}
    </>
  );
}
