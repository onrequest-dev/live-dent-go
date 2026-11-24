// client/helpers/sync-storage.ts
"use client";

// ✅ المفاتيح التي كانت تُزامن سابقاً (نحتفظ بها للتوافق مع المكونات الأخرى)
const SYNC_EXACT_KEYS = [
  "treatment_templates",
  "tooth_display_preference",
];
const SYNC_PREFIX_KEYS = [
  "tooth_template_assignments_",
];

export const isSyncableKey = (key: string): boolean => {
  if (SYNC_EXACT_KEYS.includes(key)) return true;
  return SYNC_PREFIX_KEYS.some((p) => key.startsWith(p));
};

// ============================================================
// سحب من السيرفر (تم تعطيل الوظيفة الشبكية)
// الآن يقوم فقط بإطلاق الأحداث لضمان تحديث الـ UI دون تغيير البيانات
// ============================================================
export async function pullFromServer(): Promise<void> {
  if (typeof window === "undefined") return;

  console.log("[sync] Pull from server disabled (Offline-First Mode)");
  
  // نقوم بإطلاق الأحداث فقط لتنبيه المكونات بأن البيانات قد تكون متاحة محلياً
  // هذا يضمن أن الـ UI لن تنتظر رداً من السيرفر
  window.dispatchEvent(new CustomEvent("toothAssignmentsChanged"));
  window.dispatchEvent(new CustomEvent("treatmentTemplatesChanged"));
  window.dispatchEvent(new CustomEvent("toothDisplayPreferenceChanged", {
    detail: localStorage.getItem("tooth_display_preference") || "number",
  }));
}

// ============================================================
// دفع مفتاح واحد للسيرفر (تم تعطيل الوظيفة الشبكية)
// ============================================================
export async function pushToServer(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isSyncableKey(key)) return;

  // تم تعطيل الاتصال بالسيرفر
  // console.log(`[sync] Push to server disabled for key: ${key}`);
}

// ============================================================
// Wrapper لـ localStorage.setItem 
// يحفظ محلياً فقط ولا يحاول المزامنة مع السيرفر
// ============================================================
export async function setItemAndSync(key: string, value: string): Promise<void> {
  localStorage.setItem(key, value);
  // تم حذف استدعاء pushToServer لضمان عدم حدوث أي اتصال شبكي
  
  // إطلاق الحدث المناسب بناءً على المفتاح لضمان تحديث الـ UI فوراً
  if (key === "treatment_templates") {
    window.dispatchEvent(new CustomEvent("treatmentTemplatesChanged"));
  } else if (key === "tooth_display_preference") {
    window.dispatchEvent(new CustomEvent("toothDisplayPreferenceChanged", { detail: value }));
  } else if (key.startsWith("tooth_template_assignments_")) {
    window.dispatchEvent(new CustomEvent("toothAssignmentsChanged"));
  }
}

// ============================================================
// دمج ذكي (تم تعطيله لأنه لم يعد هناك سيرفر للمقارنة معه)
// ============================================================
function tryMerge(key: string, localStr: string, serverStr: string): string | null {
  // نعيد القيمة المحلية كما هي لأننا لا نملك بيانات سيرفر لدمجها
  return localStr;
}

// ============================================================
// دمج المصفوفات (تم تعطيله)
// ============================================================
function mergeArraysByKey(key: string, localArr: any[], serverArr: any[]): any[] {
  return localArr;
}