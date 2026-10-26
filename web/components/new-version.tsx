"use client";

import { useEffect } from "react";

import { toast } from "@/components/ui/toast";

const EVERY = 5 * 60_000;

// Asks /version every few minutes and whenever the tab comes back; once a newer deploy is live,
// offers a reload (which also avoids server actions from the old build failing) and stops asking.
export function NewVersion() {
  useEffect(() => {
    const check = async () => {
      if (document.hidden) return;
      const live = await fetch("/version", { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null);
      if (!live || live === process.env.APP_VERSION) return;
      stop();
      toast.add({
        title: "Hay una nueva versión de Dineros",
        description: "Recarga la página para usarla.",
        timeout: 0,
        actionProps: { children: "Recargar", onClick: () => location.reload() },
      });
    };
    const timer = setInterval(check, EVERY);
    document.addEventListener("visibilitychange", check);
    const stop = () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
    return stop;
  }, []);
  return null;
}
