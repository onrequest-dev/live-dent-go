import { DentalChart } from "@/types";
import { db } from "@/lib/main-db"; // استخدام قاعدة البيانات الموحدة (تغني عن chartDB المنفصل)
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * جلب بيانات الشارت السني (محلي فقط)
 * ملاحظة: تم تعديل هذه الدالة لتعمل محلياً فقط تماشياً مع مبدأ "بدون الاعتماد على السيرفر أبداً"
 */
export async function fetchDentalChartFromServer(patientId: string): Promise<DentalChart | null> {
  return fetchDentalChart(patientId);
}

/**
 * جلب Dental Chart لمريض معين من قاعدة البيانات المحلية
 */
export async function fetchDentalChart(patientId: string): Promise<DentalChart | null> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    // البحث في قاعدة البيانات المحلية مع ضمان عزل بيانات العيادة
    const chart = await db.charts
      .where("clinicId")
      .equals(clinicId)
      .and((c) => c.patientId === patientId)
      .first();

    return chart || null;
  } catch (error) {
    console.error("فشل في جلب الشارت السني محلياً:", error);
    return null;
  }
}

/**
 * إنشاء أو تحديث Dental Chart لمريض (محلي فقط)
 * - يحدد تلقائياً ما إذا كان الإجراء "created" أو "updated"
 * - يضيف clinicId و lastUpdated تلقائياً
 */
export async function saveDentalChart(
  chartData: Omit<DentalChart, 'id' | 'clinicId' | 'lastUpdated'>
): Promise<{ data: DentalChart; action: "created" | "updated" }> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    // 1. التحقق مما إذا كان الشارت موجوداً مسبقاً لتحديد نوع الإجراء
    const existingChart = await db.charts
      .where("clinicId")
      .equals(clinicId)
      .and((c) => c.patientId === chartData.patientId)
      .first();

    const chartId = existingChart ? existingChart.id : generateId();
    const action = existingChart ? "updated" : "created";

    // 2. تجهيز الكائن النهائي للشارت
    const localChart: DentalChart = {
      ...chartData,
      id: chartId,
      clinicId: clinicId,
      lastUpdated: new Date(),
    };

    // 3. الحفظ أو التحديث في قاعدة البيانات المحلية (Dexie put تعمل كـ Upsert)
    await db.charts.put(localChart);

    // 4. إرجاع النتيجة بنفس الشكل الذي تتوقعه الـ UI تماماً
    return {
      data: localChart,
      action: action,
    };
  } catch (error) {
    console.error("فشل في حفظ الشارت السني محلياً:", error);
    throw new Error("حدث خطأ غير متوقع أثناء حفظ Dental Chart محلياً");
  }
}