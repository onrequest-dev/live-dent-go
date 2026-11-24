// import { Clinic, DoctorProfile, Patient, PatientCase, Session } from "@/types";
// import { ApiResponse } from "./fetch_with_retry";
// import { clinicLocalDB } from '@/lib/clinicDB';

// export type ClinicData = {
//     patients: Patient[],
//     patientCases: PatientCase[],
//     sessions: Session[]
// }

// export async function getClinic(): Promise<ApiResponse<Clinic>> {
//   try {
//     const localRecord = await clinicLocalDB.clinic.get('clinic');
    
//     if (localRecord) {
//       return { success: true, data: localRecord.data };
//     }

//     const response = await fetch("/api/v1/clinic");
//     const result = await response.json();

//     if (!response.ok) {
//       return { success: false, error: result.error || "فشل جلب بيانات العيادة" };
//     }

//     await clinicLocalDB.clinic.put({
//       key: 'clinic',
//       data: result.data,
//       synced: true,
//     });

//     return { success: true, data: result.data };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "حدث خطأ في الاتصال",
//     };
//   }
// }

// export async function updateClinic(clinicData: Partial<Clinic>): Promise<ApiResponse<Clinic>> {
//   try {
//     const existingRecord = await clinicLocalDB.clinic.get('clinic');
//     const mergedData = { ...(existingRecord?.data ?? {}), ...clinicData } as Clinic;

//     await clinicLocalDB.clinic.put({
//       key: 'clinic',
//       data: mergedData,
//       synced: false,
//     });

//     const response = await fetch("/api/v1/clinic", {
//       method: "PUT",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(clinicData),
//     });
//     const result = await response.json();

//     if (!response.ok) {
//       return { success: false, error: result.error || "فشل تحديث بيانات العيادة" };
//     }

//     await clinicLocalDB.clinic.put({
//       key: 'clinic',
//       data: result.data,
//       synced: true,
//     });

//     return { success: true, data: result.data };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "حدث خطأ في الاتصال",
//     };
//   }
// }

// export async function updateProfile(profileData: Partial<DoctorProfile>): Promise<ApiResponse<DoctorProfile>> {
//   try {
//     const existingRecord = await clinicLocalDB.doctorProfile.get('profile');
//     const mergedData = { ...(existingRecord?.data ?? {}), ...profileData } as DoctorProfile;

//     await clinicLocalDB.doctorProfile.put({
//       key: 'profile',
//       data: mergedData,
//       synced: false,
//     });

//     const response = await fetch("/api/v1/clinic/doctor-profile", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(profileData),
//     });
//     const result = await response.json();

//     if (!response.ok) {
//       return { success: false, error: result.error || "فشل تحديث بيانات الملف الشخصي للطبيب" };
//     }

//     await clinicLocalDB.doctorProfile.put({
//       key: 'profile',
//       data: result.data,
//       synced: true,
//     });

//     return { success: true, data: result.data };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "حدث خطأ في الاتصال",
//     };
//   }
// }


// export async function getClinicData(): Promise<ApiResponse<ClinicData>>{
//     try {
//     const response = await fetch("/api/v1/clinic/data");
//     const result = await response.json();

//     if (!response.ok) {
//       return { success: false, error: result.error || "فشل جلب بيانات العيادة" };
//     }
//     // console.log("clinic data fetched: ", result);
//     return { success: true, data: {patientCases: result.patientCases, patients: result.patients, sessions: result.sessions} };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "حدث خطأ في الاتصال",
//     };
//   }
// }


import { Clinic, DoctorProfile, Patient, PatientCase, Session } from "@/types";
import { ApiResponse } from "./fetch_with_retry";
import { fetchTemplates } from "./templates";
import { createDefaultTemplates } from "@/components/dashboard/tabs/TreatmentsTab";
import { db } from "@/lib/main-db"; // استيراد قاعدة البيانات المحلية الموحدة
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";


// ============================================================
// مزامنة القوالب (تم الإبقاء عليها كما هي تماماً حسب طلبك)
// ============================================================
async function syncTemplatesRaw() {
  try {
    const result = await fetchTemplates();

    if (result.success && Array.isArray(result.data)) {
      const serverTemplates = result.data;

      if (serverTemplates.length > 0) {
        localStorage.setItem("treatment_templates", JSON.stringify(serverTemplates));
        window.dispatchEvent(new CustomEvent("treatmentTemplatesChanged"));
        return serverTemplates;
      } else {
        const saved = localStorage.getItem("treatment_templates");
        let hasLocal = false;
        try {
          const parsed = saved ? JSON.parse(saved) : [];
          hasLocal = Array.isArray(parsed) && parsed.length > 0;
        } catch {}

        if (!hasLocal) {
          const defaults = createDefaultTemplates();
          localStorage.setItem("treatment_templates", JSON.stringify(defaults));
          return defaults;
        }
      }
    }
  } catch {}
  return null;
}

// ============================================================
// جلب بيانات العيادة (Online-First مع Fallback محلي)
// ============================================================
export async function getClinic(): Promise<ApiResponse<Clinic>> {
  try {
    // 1. محاولة الجلب من السيرفر أولاً
    const response = await fetch("/api/v1/clinic", { redirect: "manual" });

    if (response.type === "opaqueredirect" || response.status === 0) {
      window.location.href = "/suspended";
      return { success: false, error: "تمت إعادة التوجيه إلى صفحة تسجيل الدخول" };
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "فشل جلب بيانات العيادة");
    }

    localStorage.setItem('currency', result.data?.currency || 'USD');

    // مزامنة القوالب بعد نجاح جلب العيادة
    await syncTemplatesRaw();

    // ✅ حفظ نسخة احتياطية محدثة في قاعدة البيانات المحلية
    try {
      const clinicId = await getMyClinicIdOffline();
      if (clinicId && result.data) {
        await db.clinics.put({ ...result.data, id: clinicId });
      }
    } catch (dbError) {
      console.warn("فشل حفظ بيانات العيادة محلياً:", dbError);
    }

    return { success: true, data: result.data };

  } catch (error) {
    console.warn("فشل الاتصال بالشبكة، جاري الاعتماد على البيانات المحلية...");
    
    // 2. Fallback: الجلب من التخزين المحلي عند فشل الشبكة
    try {
      const clinicId = await getMyClinicIdOffline();
      const localClinic = await db.clinics.get(clinicId);
      
      if (localClinic) {
        return { success: true, data: localClinic };
      }
    } catch (localError) {
      console.error("فشل الجلب المحلي أيضاً:", localError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في الاتصال ولا توجد بيانات محلية",
    };
  }
}

// ============================================================
// تحديث بيانات العيادة (Local-First Write ثم محاولة السيرفر)
// ============================================================
export async function updateClinic(clinicData: Partial<Clinic>): Promise<ApiResponse<Clinic>> {
  try {
    const clinicId = await getMyClinicIdOffline();

    // ✅ 1. التحديث المحلي فوراً (Optimistic Update) لضمان استجابة الـ UI
    await db.clinics.update(clinicId, clinicData);
    const updatedLocalClinic = await db.clinics.get(clinicId);

    if (clinicData.currency) {
      localStorage.setItem('currency', clinicData.currency);
    }

    // ✅ 2. محاولة المزامنة مع السيرفر في الخلفية (Non-blocking)
    try {
      const response = await fetch("/api/v1/clinic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clinicData),
      });
      
      if (!response.ok) {
        console.warn("فشل تحديث السيرفر، لكن البيانات المحلية محدثة بنجاح.");
      }
    } catch (networkError) {
      console.warn("خطأ في الشبكة أثناء تحديث العيادة، الاعتماد على قاعدة البيانات المحلية.", networkError);
    }

    // ✅ نرجع النجاح دائماً لأن المحلي تم تحديثه بنجاح (الـ UI لن ينكسر)
    return { success: true, data: updatedLocalClinic! };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في تحديث البيانات محلياً",
    };
  }
}

// ============================================================
// تحديث ملف الطبيب الشخصي (نفس منطق Local-First)
// ============================================================
export async function updateProfile(profileData: Partial<DoctorProfile>): Promise<ApiResponse<DoctorProfile>> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    // 1. جلب العيادة الحالية لدمج التحديث
    const currentClinic = await db.clinics.get(clinicId);
    if (!currentClinic) throw new Error("العيادة غير موجودة محلياً");

    const updatedProfile = { ...currentClinic.doctorProfile, ...profileData };

    // ✅ 2. تحديث محلي فوراً
    await db.clinics.update(clinicId, { doctorProfile: updatedProfile });

    // ✅ 3. محاولة مزامنة السيرفر في الخلفية
    try {
      const response = await fetch("/api/v1/clinic/doctor-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        console.warn("فشل تحديث ملف الطبيب في السيرفر، لكن المحلي محدث.");
      }
    } catch (networkError) {
      console.warn("خطأ في الشبكة أثناء تحديث الملف الشخصي.", networkError);
    }

    return { success: true, data: updatedProfile };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في تحديث الملف الشخصي",
    };
  }
}

// ============================================================
// جلب بيانات العيادة الضخمة (Offline-First تماماً)
// ============================================================
export type ClinicData = {
  patients: Patient[];
  patientCases: PatientCase[];
  sessions: Session[];
};

export async function getClinicData(): Promise<ApiResponse<ClinicData>> {
  try {
    const clinicId = await getMyClinicIdOffline();

    // ✅ الجلب المباشر والسريع من قاعدة البيانات المحلية (لا يحتاج شبكة)
    const [patients, patientCases, sessions] = await Promise.all([
      db.patients.where("clinicId").equals(clinicId).toArray(),
      db.cases.where("clinicId").equals(clinicId).toArray(),
      db.sessions.where("clinicId").equals(clinicId).toArray(),
    ]);

    return { 
      success: true, 
      data: { patients, patientCases, sessions } 
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في جلب بيانات العيادة المحلية",
    };
  }
}