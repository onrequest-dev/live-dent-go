// components/offline-warmer.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** تابات الـ dashboard لكل مفتاح — تتطلب مفتاح (clinicId أو live-dent-go) */
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
const SW_TIMEOUT_MS = 3000;

/**
 * بناء URL للتاب — نسختان لكل تاب:
 *  - النسخة الأساسية: ?tab=xxx
 *  - النسخة البديلة: ?tab=xxx&source=offline  (أو أي بارامتر يميّز النسخة)
 *
 * ملاحظة: إذا كان التاب null (الصفحة الرئيسية) نستخدم مسارين مختلفين.
 */
const buildTabUrls = (key: string, tab: string | null): string[] => {
  const base = tab ? `/dashboard/${key}?tab=${tab}` : `/dashboard/${key}`;

  // النسخة الثانية: نضيف بارامتر لتمييزها في الـ cache
  const alt = tab
    ? `/dashboard/${key}?tab=${tab}&variant=offline`
    : `/dashboard/${key}?variant=offline`;

  return [base, alt];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** انتظار تسجيل SW مع مهلة محددة */
function waitForSW(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.serviceWorker.controller) {
      resolve(true);
      return;
    }

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
      // 🔑 1) تحقق من SW
      const swReady = await waitForSW(SW_TIMEOUT_MS);

      if (!swReady) {
        const reloadKey = "offline-warmer:reloaded";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          if (!cancelled) window.location.reload();
        } else {
          console.warn("[OfflineWarmer] SW not ready after reload — skipping");
          sessionStorage.removeItem(reloadKey);
        }
        return;
      }

      if (cancelled) return;

      // 🔑 2) بناء قائمة المفاتيح (clinicId + live-dent-go)
      const clinicId = localStorage.getItem("currentClinicId");
      const keys: string[] = [];

      if (clinicId) keys.push(clinicId);
      // live-dent-go يُعتبر مفتاحاً أيضاً
      keys.push("live-dent-go");

      if (keys.length === 0) return;

      // 🔑 3) بناء كل الـ URLs — نسختان لكل تاب لكل مفتاح
      const urls: string[] = [];
      for (const key of keys) {
        for (const tab of DASHBOARD_TABS) {
          urls.push(...buildTabUrls(key, tab));
        }
      }

      if (urls.length === 0) return;

      // 🔑 4) تحقق من آخر تسخين (مفتاح مركّب لكل المفاتيح)
      const storageKey = `offline:warmed:${keys.join("+")}`;
      const last = Number(localStorage.getItem(storageKey) ?? 0);
      if (Date.now() - last < REWARM_INTERVAL_MS) return;

      // 🔑 5) تخزين دائم
      try {
        await navigator.storage?.persist?.();
      } catch {}

      // 🔑 6) ابدأ التسخين
      setVisible(true);
      setProgress(0);

      const total = urls.length;
      let completed = 0;

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

        await sleep(REQUEST_GAP_MS);
      }

      if (!cancelled) {
        localStorage.setItem(storageKey, String(Date.now()));
        sessionStorage.removeItem("offline-warmer:reloaded");

        setProgress(100);
        await sleep(700);
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
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm pointer-events-none"
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
                  جارٍ تهيئة التطبيق
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
