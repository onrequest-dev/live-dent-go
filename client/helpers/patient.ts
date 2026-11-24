import { Patient } from "@/types";
import { db } from "@/lib/main-db";
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";

// دالة مساعدة لتوليد UUID في المتصفح
const generateId = () => crypto.randomUUID();

export async function createPatient(
  credentials: Omit<Patient, 'id' | 'clinicId' | 'createdAt'> 
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    const newPatient: Patient = {
      ...credentials,
      id: generateId(),
      clinicId: getMyClinicIdOffline(), 
      createdAt: new Date(),
    };

    // الحفظ في قاعدة بيانات المتصفح
    await db.patients.add(newPatient);

    return {
      success: true,
      data: newPatient,
    };
  } catch (error) {
    console.error('Create patient error (Client DB):', error);
    return {
      success: false,
      error: 'فشل في حفظ بيانات المريض محلياً',
    };
  }
}

export async function updatePatient(
  id: string, 
  updates: Partial<Omit<Patient, 'id' | 'clinicId' | 'createdAt'>>
): Promise<{ success: boolean; data?: Patient; error?: string }> {
  try {
    // 1. جلب المريض الحالي للتأكد من وجوده
    const existingPatient = await db.patients.get(id);
    if (!existingPatient) {
      return { success: false, error: 'المريض غير موجود' };
    }

    // 2. تحديث البيانات (Dexie تقوم بدمج التحديث تلقائياً)
    await db.patients.update(id, {
      ...updates,
      // نمنع تعديل الحقول الأساسية عن طريق الخطأ
      id: existingPatient.id,
      clinicId: existingPatient.clinicId,
      createdAt: existingPatient.createdAt,
    });

    // 3. جلب النسخة المحدثة لإرجاعها
    const updatedPatient = await db.patients.get(id);

    return {
      success: true,
      data: updatedPatient,
    };
  } catch (error) {
    console.error('Update patient error (Client DB):', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء تحديث بيانات المريض محلياً',
    };
  }
}

// دوال إضافية ستحتاجها قريباً جداً:
export async function getPatientsByClinic(clinicId: string): Promise<Patient[]> {
  return await db.patients.where('clinicId').equals(clinicId).toArray();
}

export async function deletePatient(id: string): Promise<boolean> {
  try {
    await db.patients.delete(id);
    return true;
  } catch (error) {
    console.error('Delete patient error:', error);
    return false;
  }
}