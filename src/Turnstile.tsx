import { useEffect, useRef } from "react";

export const turnstileSiteKey = "0x4AAAAAAF715uNRtkmw4L1K";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

let loading: Promise<void> | null = null;

function load() {
  if (window.turnstile) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return loading;
}

export default function Turnstile({ onToken, reset }: { onToken: (token: string) => void; reset: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useRef("");

  useEffect(() => {
    let dead = false;
    load().then(() => {
      if (dead || !ref.current || !window.turnstile) return;
      id.current = window.turnstile.render(ref.current, {
        sitekey: turnstileSiteKey,
        theme: "dark",
        callback: onToken,
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    });
    return () => {
      dead = true;
      if (id.current && window.turnstile) window.turnstile.remove(id.current);
    };
  }, []);

  useEffect(() => {
    if (!reset || !id.current || !window.turnstile) return;
    window.turnstile.reset(id.current);
    onToken("");
  }, [reset]);

  return <div ref={ref} className="mb-3.5" />;
}
