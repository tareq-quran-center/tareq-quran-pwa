/**
 * Client-side high-performance image compression utility for student avatars.
 * Features:
 * - Smart center-cropping to guarantee a perfect square without distortion.
 * - Automatic resizing to 160x160 px for optimal mobile & desktop rendering.
 * - WebP encoding with quality 0.80 (fallback to JPEG 0.75 if WebP is unsupported).
 * - Target file size: 5 - 25 KB (well below the 50 KB cap).
 */

let webpSupportCache: boolean | null = null;

export function isWebpSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (webpSupportCache !== null) return webpSupportCache;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    webpSupportCache = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    webpSupportCache = false;
  }

  return webpSupportCache;
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses a student avatar file into an ultra-light, square WebP (or JPEG) image.
 * Uses center-cropping to avoid stretching or facial deformation.
 */
export async function compressStudentAvatar(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<Blob> {
  const { maxDimension = 160, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("معالجة الصور متاحة فقط في بيئة المتصفح"));
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const srcWidth = img.naturalWidth || img.width;
      const srcHeight = img.naturalHeight || img.height;

      if (!srcWidth || !srcHeight) {
        return reject(new Error("أبعاد الصورة غير صالحة"));
      }

      // Center-crop to square
      const cropSize = Math.min(srcWidth, srcHeight);
      const sx = Math.round((srcWidth - cropSize) / 2);
      const sy = Math.round((srcHeight - cropSize) / 2);

      const canvas = document.createElement("canvas");
      canvas.width = maxDimension;
      canvas.height = maxDimension;

      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        return reject(new Error("تعذر إنشاء مساحة الرسم في المتصفح"));
      }

      // High quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Fill white background before drawing in case source has transparent alpha
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, maxDimension, maxDimension);

      // Draw cropped and scaled image
      ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, maxDimension, maxDimension);

      const supportsWebp = isWebpSupported();
      const mimeType = supportsWebp ? "image/webp" : "image/jpeg";
      const targetQuality = supportsWebp ? quality : Math.min(quality, 0.75);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("فشل توليد الصورة المضغوطة"));
          }

          // In the rare case that the 160x160 blob exceeds 50 KB, re-compress with lower quality
          if (blob.size > 50 * 1024) {
            canvas.toBlob(
              (reducedBlob) => {
                if (reducedBlob) {
                  resolve(reducedBlob);
                } else {
                  resolve(blob);
                }
              },
              mimeType,
              0.6
            );
          } else {
            resolve(blob);
          }
        },
        mimeType,
        targetQuality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("ملف الصورة غير صالح أو تالف"));
    };

    img.src = objectUrl;
  });
}

/**
 * Backward-compatible generic compression function
 */
export async function compressImage(
  file: File | Blob,
  maxDimension = 160,
  quality = 0.8
): Promise<Blob> {
  return compressStudentAvatar(file, { maxDimension, quality });
}

/**
 * Converts a Blob to a base64 Data URL for instant previews and fallback storage.
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("فشل تحويل الصورة إلى مسار مشفر"));
      }
    };
    reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة"));
    reader.readAsDataURL(blob);
  });
}
