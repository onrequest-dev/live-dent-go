// lib/media-manager.ts

// خريطة لتخزين الروابط النشطة: المفتاح هو mediaId والقيمة هي رابط blob
const activeBlobUrls = new Map<string, string>();

/**
 * الحصول على رابط Blob لمعرف معين، مع التأكد من عدم تكرار الإنشاء
 */
export async function getManagedMediaUrl(mediaId: string | undefined | null): Promise<string | undefined> {
  if (!mediaId) return undefined;

  // إذا كان الرابط موجوداً بالفعل في الذاكرة، نعيده فوراً
  if (activeBlobUrls.has(mediaId)) {
    return activeBlobUrls.get(mediaId);
  }

  // استيراد ديناميكي لتجنب التداخلات الدائرية (Circular Dependencies)
  const { getLocalMediaUrl } = await import('@/client/helpers/upload_image');
  
  const url = await getLocalMediaUrl(mediaId);
  
  if (url && url.startsWith('blob:')) {
    activeBlobUrls.set(mediaId, url);
    return url;
  }
  
  // إذا كان رابط سيرفر عادي، نعيده كما هو دون تخزينه كـ blob
  return url || undefined;
}

/**
 * تنظيف جميع الروابط من الذاكرة (يستخدم عند تسجيل الخروج أو تبديل الحساب)
 */
export function clearAllMediaUrls() {
  activeBlobUrls.forEach((url) => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
  activeBlobUrls.clear();
}

/**
 * تنظيف رابط محدد (يستخدم عند حذف صورة معينة)
 */
export function revokeMediaUrl(mediaId: string) {
  const url = activeBlobUrls.get(mediaId);
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    activeBlobUrls.delete(mediaId);
  }
}