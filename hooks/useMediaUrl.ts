// hooks/useMediaUrl.ts
import { getLocalMediaUrl } from '@/client/helpers/upload_image';
import { useState, useEffect } from 'react';

/**
 * هوك مخصص لجلب روابط الوسائط المخزنة محلياً أو السيرفر
 * يتعامل تلقائياً مع إنشاء وإلغاء روابط Blob لمنع تسرب الذاكرة
 */
export function useMediaUrl(mediaId: string | undefined | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl: string | null = null;

    async function fetchMedia() {
      if (!mediaId) {
        setUrl(null);
        return;
      }

      setIsLoading(true);

      try {
        // جلب الرابط من دالة التخزين المحلي/السيرفر
        const fetchedUrl = await getLocalMediaUrl(mediaId);
        
        if (isMounted) {
          currentBlobUrl = fetchedUrl;
          setUrl(fetchedUrl);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load media URL:", error);
        if (isMounted) {
          setUrl(null);
          setIsLoading(false);
        }
      }
    }

    fetchMedia();

    // دالة التنظيف: ضرورية جداً لإلغاء رابط Blob عند اختفاء المكون
    return () => {
      isMounted = false;
      if (currentBlobUrl && currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [mediaId]);

  return { url, isLoading };
}