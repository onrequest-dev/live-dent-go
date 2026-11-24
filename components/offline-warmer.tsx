// components/offline-warmer.tsx
"use client";

import { useEffect } from "react";

const DASHBOARD_TABS = [
  null,
  "main",
  "patients",
  "schedule",
  "treatments",
  "settings",
  "clinic",
  "cv",
] as const;

const REQUEST_GAP_MS = 300;
const REWARM_INTERVAL_MS = 6 * 60 * 60 * 1000;

const buildUrl = (clinicId: string, tab: string | null) =>
  tab ? `/dashboard/${clinicId}?tab=${tab}` : `/dashboard/${clinicId}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function OfflineWarmer() {
  useEffect(() => {
    if (!navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        await navigator.serviceWorker.ready;
      } catch {
        return;
      }
      if (cancelled) return;

      const clinicId = localStorage.getItem("currentClinicId");
      if (!clinicId) return;

      const key = `offline:warmed:${clinicId}`;
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last < REWARM_INTERVAL_MS) return;

      try {
        await navigator.storage?.persist?.();
      } catch {}

      for (const tab of DASHBOARD_TABS) {
        if (cancelled || !navigator.onLine) return;
        const url = buildUrl(clinicId, tab);

        try {
          await fetch(url, {
            priority: "low",
            credentials: "include",
          });
        } catch {}

        await sleep(REQUEST_GAP_MS);
      }

      if (!cancelled) localStorage.setItem(key, String(Date.now()));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}