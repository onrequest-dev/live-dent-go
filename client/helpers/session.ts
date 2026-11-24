// client/helpers/sessions.ts

import { Session } from "@/types";
import { ApiResponse } from "./fetch_with_retry";
import { db } from "@/lib/main-db"; // استيراد قاعدة البيانات المحلية
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";

// دالة مساعدة لتوليد UUID محلياً
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback للمتصفحات القديمة جداً
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================
// إنشاء جلسة جديدة
// ============================================================
export async function createSession(
  credentials: Omit<Session, "id" | "clinicId" | "createdAt"> & {
    info: {
      clinicName: string;
      patientName: string;
      gender: string;
      phoneNumber: string;
      prevent_auto_messages: boolean;
    };
  }
): Promise<ApiResponse<Session>> {
  try {
    const clinicId = await getMyClinicIdOffline();

    // ✅ نحافظ على نفس شكل الكائن تماماً، نضيف فقط id و clinicId
    const newSession = {
      ...credentials,
      id: generateId(),
      clinicId: clinicId,
    } as Session; // Type assertion لضمان التوافق مع الـ Return Type

    // ✅ التخزين المحلي بدلاً من الـ API و sessionStorage
    await db.sessions.add(newSession);

    return {
      success: true,
      data: newSession,
    };
  } catch (error) {
    console.error("Create session error (Local DB):", error);
    return {
      success: false,
      error: "فشل في حفظ الجلسة محلياً",
    };
  }
}

// ============================================================
// إنشاء عدة مواعيد بطلب واحد
// ============================================================
export async function createBulkSessions(
  sessionsPayload: (Omit<Session, "id" | "clinicId" | "createdAt"> & {
    info: {
      clinicName: string;
      patientName: string;
      gender: string;
      phoneNumber: string;
      prevent_auto_messages: boolean;
    };
  })[]
): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();

    // ✅ نحافظ على نفس شكل الكائنات تماماً
    const newSessions = sessionsPayload.map((payload) => ({
      ...payload,
      id: generateId(),
      clinicId: clinicId,
    })) as Session[];

    // ✅ التخزين المحلي الدفعي (أسرع وأأمن من الحلقة)
    await db.sessions.bulkAdd(newSessions);

    return {
      success: true,
      data: newSessions,
    };
  } catch (error) {
    console.error("Create bulk sessions error (Local DB):", error);
    return {
      success: false,
      error: "فشل في حفظ الجلسات محلياً",
    };
  }
}

// ============================================================
// تحديث جلسة موجودة
// ============================================================
export async function updateSession(
  sessionId: string,
  updateData: Partial<Omit<Session, "id" | "clinicId" | "createdAt">>
): Promise<ApiResponse<Session>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    // التحقق من الملكية قبل التحديث
    const existing = await db.sessions.get(sessionId);
    if (!existing || existing.clinicId !== clinicId) {
      return { success: false, error: "الجلسة غير موجودة أو غير مصرح بها" };
    }

    await db.sessions.update(sessionId, updateData);
    const updatedSession = await db.sessions.get(sessionId);

    return {
      success: true,
      data: updatedSession!,
    };
  } catch (error) {
    console.error("Update session error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ أثناء تحديث الجلسة محلياً",
    };
  }
}

// ============================================================
// حذف جلسة
// ============================================================
export async function deleteSession(sessionId: string): Promise<ApiResponse<null>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const existing = await db.sessions.get(sessionId);
    
    if (!existing || existing.clinicId !== clinicId) {
      return { success: false, error: "الجلسة غير موجودة أو غير مصرح بها" };
    }

    await db.sessions.delete(sessionId);

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Delete session error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حذف الجلسة محلياً",
    };
  }
}

// ============================================================
// جلب جلسة واحدة
// ============================================================
export async function getSession(sessionId: string): Promise<ApiResponse<Session>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const session = await db.sessions.get(sessionId);

    if (!session || session.clinicId !== clinicId) {
      return { success: false, error: "الجلسة غير موجودة" };
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Get session error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب البيانات محلياً",
    };
  }
}

// ============================================================
// جلب جميع الجلسات
// ============================================================
export async function getAllSessions(): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const sessions = await db.sessions.where("clinicId").equals(clinicId).toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get all sessions error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب البيانات محلياً",
    };
  }
}

// ============================================================
// جلب جلسات مريض محدد
// ============================================================
export async function getPatientSessions(patientId: string): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const sessions = await db.sessions
      .where("clinicId")
      .equals(clinicId)
      .and((session) => session.patientId === patientId)
      .toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get patient sessions error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب بيانات المريض محلياً",
    };
  }
}

// ============================================================
// جلب جلسات اليوم
// ============================================================
export async function getTodaySessions(): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await db.sessions
      .where("clinicId")
      .equals(clinicId)
      .and((session) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startOfDay && sessionDate <= endOfDay;
      })
      .toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get today sessions error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب جلسات اليوم محلياً",
    };
  }
}

// ============================================================
// جلب الجلسات حسب التاريخ
// ============================================================
export async function getSessionsByDate(date: Date | string): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const targetDate = new Date(date);
    
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await db.sessions
      .where("clinicId")
      .equals(clinicId)
      .and((session) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= startOfDay && sessionDate <= endOfDay;
      })
      .toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get sessions by date error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب الجلسات محلياً",
    };
  }
}

// ============================================================
// جلب الجلسات حسب الحالة
// ============================================================
export async function getSessionsByStatus(status: Session["status"]): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const sessions = await db.sessions
      .where("clinicId")
      .equals(clinicId)
      .and((session) => session.status === status)
      .toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get sessions by status error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب الجلسات محلياً",
    };
  }
}

// ============================================================
// تحديث حالة الجلسة فقط
// ============================================================
export async function updateSessionStatus(
  sessionId: string,
  status: Session["status"]
): Promise<ApiResponse<Session>> {
  return updateSession(sessionId, { status });
}

// ============================================================
// تحديث حالة الدفع للجلسة
// ============================================================
export async function updateSessionPayment(
  sessionId: string,
  isPaid: boolean,
  paymentMethod?: "cash" | "card" | "transfer"
): Promise<ApiResponse<Session>> {
  const updateData: Partial<Session> = {
    isPaid,
    paidAt: isPaid ? new Date() : undefined,
    paymentMethod: isPaid ? paymentMethod : undefined,
  };
  
  return updateSession(sessionId, updateData);
}

// ============================================================
// جلب الجلسات في نطاق زمني
// ============================================================
export async function getSessionsInRange(
  startDate: Date | string,
  endDate: Date | string
): Promise<ApiResponse<Session[]>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const sessions = await db.sessions
      .where("clinicId")
      .equals(clinicId)
      .and((session) => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= start && sessionDate <= end;
      })
      .toArray();

    return {
      success: true,
      data: sessions,
    };
  } catch (error) {
    console.error("Get sessions in range error (Local DB):", error);
    return {
      success: false,
      error: "حدث خطأ في جلب النطاق الزمني محلياً",
    };
  }
}