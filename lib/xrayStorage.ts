// lib/xrayStorage.ts

import { db } from './main-db'; // استيراد قاعدة البيانات الموحدة
import { getMyClinicIdOffline } from '@/client/helpers/get-myclinic-id-offline'; // تأكد من المسار الصحيح
import { handleUploadXrayFile, revokeMediaUrl } from '@/client/helpers/upload_image'; // دالة الرفع المحلي التي أنشأناها سابقاً

// تعريف نوع البيانات الوصفية للصورة (للتوافق مع الكود القديم)
export interface XrayImageMetadata {
  id: string;
  patientId: string;
  title: string;
  img_tele_id: string; // سنستخدمه هنا كمعرف للملف المحلي (mediaId)
  created_at: string;
  mimeType?: string;
}

// تحويل File أو Blob إلى Base64 (اختياري، لكننا سنستخدم Blobs مباشرة في IndexedDB)
// لن نحتاج لهذه الدالة الآن لأن Dexie يتعامل مع Blobs بكفاءة

// ✅ دالة إضافة صورة واحدة (محلي فقط)
export interface AddImageParams {
  patientId: string;
  file: File;
  title?: string;
}

export interface AddedImageResult {
  id: string;
  title: string;
  img_tele_id: string; // سيكون هنا mediaId المحلي (مثل: xray_filename.jpg)
  created_at: string;
  localUrl: string; // رابط blob للعرض الفوري
}

export async function addXRayImage({ patientId, file, title = '' }: AddImageParams): Promise<AddedImageResult> {
  try {
    const clinicId = await getMyClinicIdOffline();
    
    // 1. رفع الملف محلياً باستخدام الدالة الموحدة (يحفظ في جدول media ويعيد blob URL)
    const { mediaId, url: localBlobUrl } = await handleUploadXrayFile(file, patientId);

    // 2. حفظ البيانات الوصفية (Metadata) في جدول منفصل لسهولة البحث والتصفية حسب المريض
    // ملاحظة: يمكنك أيضاً تخزين هذه البيانات داخل جدول media نفسه إذا أردت توحيد كل شيء،
    // لكن فصل الـ Metadata يسهل عمليات الفلترة المعقدة.
    const newRecord: XrayImageMetadata = {
      id: crypto.randomUUID(), // معرف فريد للسجل الوصفي
      patientId,
      title: title || file.name,
      img_tele_id: mediaId, // ربط السجل بالملف المخزن في جدول media
      created_at: new Date().toISOString(),
      mimeType: file.type,
    };

    await db.images.put(newRecord); // تأكد من وجود جدول images في main-db.ts أو استخدم جدولاً آخر

    // 3. إرجاع النتيجة بنفس الشكل المتوقع
    return {
      id: newRecord.id,
      title: newRecord.title,
      img_tele_id: newRecord.img_tele_id,
      created_at: newRecord.created_at,
      localUrl: localBlobUrl,
    };

  } catch (error) {
    console.error("Failed to add X-Ray locally:", error);
    throw new Error("فشل حفظ الصورة محلياً");
  }
}

// واجهة صورة المريض
export interface PatientImage {
  id: string;
  title: string;
  img_tele_id: string;
  created_at: string;
  localUrl: string;
  mimeType?: string;
}

// ✅ دالة جلب صور المريض (محلي فقط)
export async function getPatientImages(patientId: string): Promise<PatientImage[]> {
  try {
    // 1. جلب البيانات الوصفية من IndexedDB
    const localImages = await db.images.where('patientId').equals(patientId).toArray();
    
    // 2. بناء الروابط لكل صورة
    const result: PatientImage[] = [];

    for (const img of localImages) {
      let localUrl: string | null = null;

      // محاولة جلب رابط الملف من جدول media باستخدام المعرف (img_tele_id)
      // نستخدم دالة مساعدة لجلب الرابط بشكل آمن
      try {
        // استيراد ديناميكي لتجنب التداخلات إذا لزم الأمر، أو مباشر
        const { getLocalMediaUrl } = await import('@/client/helpers/upload_image');
        localUrl = await getLocalMediaUrl(img.img_tele_id);
      } catch (e) {
        console.warn(`Could not resolve URL for ${img.img_tele_id}`, e);
      }

      // إذا فشل الجلب، نستخدم صورة افتراضية
      if (!localUrl) {
        localUrl = '/images/image-placeholder.svg';
      }

      result.push({
        id: img.id,
        title: img.title,
        img_tele_id: img.img_tele_id,
        created_at: img.created_at,
        localUrl,
        mimeType: img.mimeType,
      });
    }

    // ترتيب النتائج حسب الأحدث أولاً
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  } catch (error) {
    console.error("Failed to get patient images locally:", error);
    return [];
  }
}

// ✅ دالة حذف صورة (محلي فقط)
export async function deleteXRayImage(imageId: string, patientId?: string): Promise<void> {
  try {
    // 1. جلب البيانات الوصفية للصورة
    const imageMeta = await db.images.get(imageId);
    
    if (imageMeta) {
      await db.media.delete(imageMeta.img_tele_id);
revokeMediaUrl(imageMeta.img_tele_id);   // ← جديد
await db.images.delete(imageId);
    }
  } catch (error) {
    console.error("Failed to delete X-Ray locally:", error);
    throw new Error("فشل حذف الصورة محلياً");
  }
}

// تحرير الروابط المؤقتة (لا تزال مفيدة للتنظيف اليدوي إذا لزم الأمر)
export function revokeLocalUrl(url: string) {
  if (!url || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
  // إزالة من كاش upload_image حتى لا يُعاد نفس الرابط المبطّل
  import('@/client/helpers/upload_image').then(({ revokeMediaUrlByUrl }) => {
    revokeMediaUrlByUrl(url);
  });
}