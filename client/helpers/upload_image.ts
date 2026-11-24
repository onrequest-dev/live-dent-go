import { compressLogo, compressPfpImage } from "./compress_images";
import { db } from "@/lib/main-db";
import { getMyClinicIdOffline } from "./get-myclinic-id-offline";
import { supabase_client } from "@/lib/supabase-client";

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

/**
 * رفع صورة (شعار أو صورة شخصية) — Online-First
 * التوقيع لم يتغير: (file, type, clinicId?, menuId?)
 * القيمة المُرجعة لم تتغير: string (URL أو Base64)
 *
 * 1. ضغط الصورة.
 * 2. محاولة الرفع إلى Supabase (مثل القديم تماماً).
 * 3. عند النجاح: نحفظ Base64 أيضاً في db.clinics (logo/pfp) ونرجع Public URL.
 * 4. عند الفشل: نحفظ Base64 في db.clinics ونرجعه (رابط دائم).
 */
export const handleUploadImage = async (
  file: File,
  type: 'logo' | 'pfp',
  clinicId?: string,
  menuId?: string
): Promise<string> => {
  if (!file) throw new Error("لم يتم توفير ملف");

  // 1. ضغط
  let compressedFile: File | Blob = file;
  if (type === 'logo') compressedFile = await compressLogo(file);
  else if (type === 'pfp') compressedFile = await compressPfpImage(file);

  // 2. Base64 (نحتاجه في كل الحالات كـ رابط دائم)
  const base64 = await blobToDataUrl(compressedFile);

  // 3. إعداد اسم الملف والمسار (نفس منطق القديم)
  const fileExt = file.name.split('.').pop() || 'jpg';
  let fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  if (type === 'pfp' && menuId) fileName = `pfp_${menuId}.${fileExt}`;
  if (type === 'logo' && clinicId) fileName = `logo_${clinicId}.${fileExt}`;

  const filePath = `${type}s/${fileName}`;
  const actualClinicId = clinicId || (await getMyClinicIdOffline());
  const mediaId = `${type}_${fileName}`;

  // ============================================================
  // المحاولة الأولى: الرفع للسيرفر (Online-First)
  // ============================================================
  try {
    const { error } = await supabase_client.storage
      .from('images')
      .upload(filePath, compressedFile, {
        cacheControl: '0',
        upsert: true,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase_client.storage
      .from('images')
      .getPublicUrl(filePath);

    if (!publicUrl) throw new Error("فشل الحصول على الرابط العام");

    // ✅ backup في media (كما القديم، للتوافق)
    await db.media.put({
      id: mediaId,
      type,
      clinicId: actualClinicId,
      file: new Blob([publicUrl], { type: 'text/plain' }),
      mimeType: 'text/uri-list',
      createdAt: new Date(),
    });

    // ✅ نحفظ Base64 أيضاً في db.clinics كـ safety net (رابط دائم محلي)
    await persistBase64ToClinic(type, actualClinicId, base64, menuId);

    return publicUrl; // ← نفس القيمة التي كان الـ UI يتوقعها
  } catch (serverError) {
    console.warn("فشل الرفع للسيرفر، جاري الاعتماد على Base64 المحلي...", serverError);

    // ============================================================
    // Fallback: Base64 محلي (رابط دائم)
    // ============================================================
    try {
      // backup في media (للتوافق مع أي كود قديم يقرأ من media)
      await db.media.put({
        id: mediaId,
        type,
        clinicId: actualClinicId,
        file: compressedFile,
        mimeType: compressedFile.type || 'image/jpeg',
        createdAt: new Date(),
      });

      // ✅ نحفظ Base64 في db.clinics
      await persistBase64ToClinic(type, actualClinicId, base64, menuId);

      return base64; // ← رابط دائم (بدل Blob المؤقت القديم)
    } catch (localError) {
      console.error("فشل الحفظ المحلي أيضاً:", localError);
      throw new Error("فشل رفع الصورة عبر الشبكة أو حفظها محلياً");
    }
  }
};

/**
 * حفظ Base64 في جدول clinics بالحقل المناسب (logo أو doctorProfile.pfpUrl)
 * - logo → clinics.logo
 * - pfp  → clinics.doctorProfile.pfpUrl
 */
async function persistBase64ToClinic(
  type: 'logo' | 'pfp',
  clinicId: string,
  base64: string,
  menuId?: string
) {
  try {
    const clinic = await db.clinics.get(clinicId);
    if (!clinic) return; // لا يوجد سجل عيادة بعد؛ الـ UI سيتولى الحفظ عبر updateClinic/updateProfile

    if (type === 'logo') {
      await db.clinics.update(clinicId, { logo: base64 });
    } else {
      const doctorProfile = { ...(clinic.doctorProfile ?? {}), pfpUrl: base64 };
      await db.clinics.update(clinicId, {
        doctorProfile,
      });
    }
  } catch (e) {
    console.warn("persistBase64ToClinic: تعذر الحفظ التلقائي (سيتولاه الـ UI):", e);
  }
}


/**
 * رفع ملف أشعة وتخزينه محلياً فقط (Offline-First)
 */
export const handleUploadXrayFile = async (
  file: File,
  patientId?: string
): Promise<{ mediaId: string; url: string }> => {
  if (!file) throw new Error("لم يتم توفير ملف");

  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const randomStr = Math.random().toString(36).substring(7);
    const fileName = `img_${Date.now()}_${randomStr}.${fileExt}`;
    const mediaId = `xray_${fileName}`;

    const actualClinicId = await getMyClinicIdOffline();

    await db.media.put({
  id: mediaId,
  type: 'xray',
  clinicId: actualClinicId,
  patientId,
  file: file,
  mimeType: file.type || 'image/jpeg',
  createdAt: new Date(),
});

// استخدم نفس مسار الكاش حتى يكون هناك URL واحد موحّد لكل mediaId
const url = await getLocalMediaUrl(mediaId);
if (!url) throw new Error("فشل إنشاء رابط للملف المرفوع");

return { mediaId, url };
  } catch (error) {
    console.error("Local xray upload error:", error);
    throw new Error("فشل في حفظ الأشعة محلياً");
  }
};

// ============================================================
// دالة استرجاع الرابط (تتعامل مع السيرفر والمحلي بذكاء)
// ============================================================
const urlCache = new Map<string, string>();

export async function getLocalMediaUrl(mediaId: string): Promise<string | null> {
  const cached = urlCache.get(mediaId);
  if (cached) return cached;

  try {
    const record = await db.media.get(mediaId);
    if (!record || !record.file) return null;

    const url =
      record.mimeType === 'text/uri-list'
        ? await record.file.text()
        : URL.createObjectURL(record.file);

    urlCache.set(mediaId, url);
    return url;
  } catch (error) {
    console.error("Error retrieving media:", error);
    return null;
  }
}

export function revokeMediaUrl(mediaId: string) {
  const url = urlCache.get(mediaId);
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  urlCache.delete(mediaId);
}

export function revokeMediaUrlByUrl(url: string) {
  let found = false;
  urlCache.forEach((u, id) => {
    if (found) return;
    if (u === url) {
      urlCache.delete(id);
      if (u.startsWith('blob:')) URL.revokeObjectURL(u);
      found = true;
    }
  });
}