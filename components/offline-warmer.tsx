// components/offline-warmer.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** تابات الـ dashboard */
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

// 🔴 زدنا الفاصل الزمني إلى 500ms لمنع خطأ 503 من السيرفر
const REQUEST_GAP_MS = 500;
const REWARM_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SW_TIMEOUT_MS = 3000;

const buildUrl = (key: string, tab: string | null) =>
  tab ? `/dashboard/${key}?tab=${tab}` : `/dashboard/${key}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitForSW(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.serviceWorker.controller) return resolve(true);
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };
    const onControllerChange = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    navigator.serviceWorker.ready
      .then(() => finish(true))
      .catch(() => finish(false));
    function cleanup() {
      clearTimeout(timer);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    }
  });
}

export function OfflineWarmer() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      const swReady = await waitForSW(SW_TIMEOUT_MS);
      if (!swReady) {
        const reloadKey = "offline-warmer:reloaded";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          if (!cancelled) window.location.reload();
        }
        return;
      }
      if (cancelled) return;

      const clinicId = localStorage.getItem("currentClinicId");
      if (!clinicId) return;

      // 🔑 تجهيز المفاتيح: الـ ID الحقيقي + live-dent-go
      const keys = [clinicId, "live-dent-go"];

      // 🔑 بناء الروابط لكل مفتاح
      const urls: string[] = [];
      for (const key of keys) {
        for (const tab of DASHBOARD_TABS) {
          urls.push(buildUrl(key, tab));
        }
      }

      if (urls.length === 0) return;

      // 🔑 التحقق من وقت التخزين
      const storageKey = `offline:warmed:${clinicId}+live-dent-go`;
      const last = Number(localStorage.getItem(storageKey) ?? 0);
      if (Date.now() - last < REWARM_INTERVAL_MS) return;

      try {
        await navigator.storage?.persist?.();
      } catch {}

      setVisible(true);
      setProgress(0);

      const total = urls.length;
      let completed = 0;

      // 🔑 جلب الروابط وتخزينها
      for (const url of urls) {
        if (cancelled || !navigator.onLine) break;

        try {
          await fetch(url, {
            priority: "low",
            credentials: "include",
          });
        } catch {}

        completed++;
        if (!cancelled) {
          setProgress(Math.round((completed / total) * 100));
        }

        // الانتظار بين كل طلب لمنع 503
        await sleep(REQUEST_GAP_MS);
      }

      if (!cancelled) {
        localStorage.setItem(storageKey, String(Date.now()));
        sessionStorage.removeItem("offline-warmer:reloaded");

        setProgress(100);
        await sleep(800);
        if (!cancelled) setVisible(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-warmer"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-5 z-[9999] mx-auto w-auto max-w-sm pointer-events-none"
          dir="rtl"
        >
          <div className="rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="shrink-0 w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  جارٍ تهيئة التطبيق أوفلاين
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {progress < 100
                    ? "أبقِ جهازك متصلاً بالإنترنت..."
                    : "اكتمل! التطبيق جاهز للعمل أوفلاين ✓"}
                </p>
              </div>
              <span className="text-xs font-mono text-gray-400 shrink-0">
                {progress}%
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-blue-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
