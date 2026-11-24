// helpers/templates.ts

import { db } from "@/lib/main-db"; // استيراد قاعدة البيانات الموحدة
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * جلب القوالب محلياً (بدون اتصال بالشبكة)
 * يحافظ على نفس شكل المخرجات الذي تتوقعه الـ UI
 */
export async function fetchTemplates(): Promise<ApiResponse<any[]>> {
  try {
    const clinicId =  getMyClinicIdOffline();

    // جلب جميع القوالب التابعة لهذه العيادة فقط من قاعدة البيانات المحلية
    const localRecords = await db.templates
      .where("clinicId")
      .equals(clinicId)
      .toArray();

    // استخراج بيانات القوالب فقط لتطابق الشكل القديم (مصفوفة من الكائنات)
    const templatesArray = localRecords.map((record) => record.templateData);

    return { 
      success: true, 
      data: templatesArray 
    };
  } catch (error) {
    console.error("Fetch templates error (Local DB):", error);
    return { 
      success: false, 
      error: "فشل جلب القوالب من التخزين المحلي" 
    };
  }
}

/**
 * حفظ القوالب محلياً (بدون اتصال بالشبكة)
 * يقوم بمسح القوالب القديمة لهذه العيادة واستبدالها بالجديدة لمنع التكرار
 */
export async function saveTemplates(
  templates: any[]
): Promise<ApiResponse<any>> {
  try {
    const clinicId =  getMyClinicIdOffline();

    // 1. حذف أي قوالب قديمة تابعة لهذه العيادة لضمان عدم وجود تكرار
    await db.templates.where("clinicId").equals(clinicId).delete();

    // 2. تجهيز البيانات للإدخال مع إضافة معرف فريد ومعرف العيادة
    const recordsToAdd = templates.map((templateData, index) => ({
      id: templateData.id || `tpl_${Date.now()}_${index}`, // توليد id إذا لم يكن موجوداً
      clinicId: clinicId,
      templateData: templateData, // نحتفظ بالبيانات الأصلية كما هي
    }));

    // 3. حفظ الدفعات الجديدة في قاعدة البيانات المحلية
    if (recordsToAdd.length > 0) {
      await db.templates.bulkAdd(recordsToAdd);
    }

    // 4. إرجاع استجابة نجاح بنفس الشكل الذي تتوقعه الـ UI
    return { 
      success: true, 
      data: { message: "تم حفظ القوالب محلياً بنجاح" } 
    };
  } catch (error) {
    console.error("Save templates error (Local DB):", error);
    return { 
      success: false, 
      error: "فشل حفظ القوالب في التخزين المحلي" 
    };
  }
}