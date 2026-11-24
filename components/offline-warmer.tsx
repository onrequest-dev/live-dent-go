// src/components/offline-warmer.tsx
"use client";

import { useEffect } from "react";

/**
 * التابات التي نريد تسخينها أوفلاين لكل عيادة.
 * عدّلها حسب تطبيقك.
 */
const DASHBOARD_TABS = [
  null, // /dashboard/[id]          ← بدون query (tab=main افتراضياً)
  "main",
  "patients",
  "schedule",
  "treatments",
  "settings",
  "clinic",
  "cv",
] as const;

/** الفاصل بين كل طلب وآخر (ms) حتى لا نزحم الشبكة */
const REQUEST_GAP_MS = 250;

/** لا نُعيد التسخين قبل مرور هذه المدة (ms) — 6 ساعات */
const REWARM_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** مفتاح localStorage لتتبّع آخر تسخين لكل عيادة */
const lastWarmKey = (clinicId: string) => `offline:warmed:${clinicId}`;

/** بناء رابط الـ dashboard لتاب معيّن */
function buildUrl(clinicId: string, tab: string | null): string {
  const base = `/dashboard/${clinicId}`;
  return tab ? `${base}?tab=${tab}` : base;
}

/** انتظار بسيط */
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * يطلب صفحة (HTML) ثم RSC لنفس الرابط.
 * - طلب HTML يُخزَّن تحت pathname (بدون query) ليخدم F5.
 * - طلب RSC يُخزَّن تحت URL كامل ليخدم التنقل الداخلي.
 */
async function warmOne(url: string): Promise<void> {
  // 1) HTML — يعترضه SW ويخزّنه (مفتاح normalized بدون query)
  try {
    await fetch(url, {
      priority: "low",
      cache: "no-store",
    });
  } catch {
    /* تجاهل — قد يكون أوفلاين */
  }

  await sleep(REQUEST_GAP_MS);

  // 2) RSC payload — يعترضه SW ويخزّنه تحت URL كامل
  try {
    await fetch(url, {
      headers: { RSC: "1" },
      priority: "low",
      cache: "no-store",
    });
  } catch {
    /* تجاهل */
  }
}

export function OfflineWarmer() {
  useEffect(() => {
    // لا نعمل شيئاً أوفلاين
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    (async () => {
      // 1) انتظر حتى يجهز الـ SW (مهم جداً — وإلا يفوت التسخين)
      try {
        await navigator.serviceWorker.ready;
      } catch {
        return;
      }
      if (cancelled) return;

      // 2) اقرأ currentClinicId من localStorage
      const clinicId = localStorage.getItem("currentClinicId");
      if (!clinicId) return;

      // 3) تحقق من آخر تسخين
      const key = lastWarmKey(clinicId);
      const last = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - last < REWARM_INTERVAL_MS) return;

      // 4) اسأل عن التخزين الدائم (مرة واحدة — لا يضر إن رُفض)
      try {
        await navigator.storage?.persist?.();
      } catch {
        /* تجاهل */
      }

      // 5) سخّن كل التابات بالتتابع
      for (const tab of DASHBOARD_TABS) {
        if (cancelled) return;
        if (!navigator.onLine) return; // انقطع النت — توقف
        await warmOne(buildUrl(clinicId, tab));
      }

      // 6) سجّل وقت التسخين
      if (!cancelled) {
        localStorage.setItem(key, String(Date.now()));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
