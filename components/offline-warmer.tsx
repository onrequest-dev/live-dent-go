// components/offline-warmer.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
const SW_TIMEOUT_MS = 3000; // إذا لم يُسجّل SW خلال 3 ثوانٍ → حدّث الصفحة

const buildUrl = (clinicId: string, tab: string | null) =>
  tab ? `/dashboard/${clinicId}?tab=${tab}` : `/dashboard/${clinicId}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** انتظار تسجيل SW مع مهلة محددة */
function waitForSW(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    // مسجّل بالفعل
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

    // أيضاً تحقق عبر ready كـ fallback
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
  const [progress, setProgress] = useState(0); // 0 → 100

  useEffect(() => {
    if (!navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      // 🔑 1) تحقق من SW أولاً
      const swReady = await waitForSW(SW_TIMEOUT_MS);

      if (!swReady) {
        // SW غير مسجّل → حدّث الصفحة لإعادة التسجيل
        if (!cancelled) window.location.reload();
        return;
      }

      if (cancelled) return;

      // 🔑 2) اقرأ clinicId
      const clinicId = localStorage.getItem("currentClinicId");
      if (!clinicId) return;

      // 🔑 3) تحقق من آخر تسخين
      const key = `offline:warmed:${clinicId}`;
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last < REWARM_INTERVAL_MS) return;

      // 🔑 4) اطلب تخزين دائم
      try {
        await navigator.storage?.persist?.();
      } catch {}

      // 🔑 5) أظهر البروجرس
      setVisible(true);
      setProgress(0);

      const total = DASHBOARD_TABS.length;
      let completed = 0;

      for (const tab of DASHBOARD_TABS) {
        if (cancelled || !navigator.onLine) break;

        try {
          await fetch(buildUrl(clinicId, tab), {
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
        localStorage.setItem(key, String(Date.now()));

        // 🔑 6) إخفاء سلس بعد اكتمال 100%
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
              {/* أيقونة تهيئة */}
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

            {/* شريط التقدم */}
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
