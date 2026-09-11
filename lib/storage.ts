import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a student recitation audio recording to Supabase Storage bucket 'recitation-audio'
 * and returns the public URL.
 */
export async function uploadRecitationAudio(
  studentId: string,
  audioBlob: Blob
): Promise<string | null> {
  if (!studentId || !audioBlob || audioBlob.size === 0) {
    return null;
  }

  try {
    const supabase = createClient();
    const isMp4 = audioBlob.type.includes("mp4");
    const isOgg = audioBlob.type.includes("ogg");
    const ext = isMp4 ? "mp4" : isOgg ? "ogg" : "webm";
    const contentType = audioBlob.type || `audio/${ext}`;
    const fileName = `${studentId}/${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("recitation-audio")
      .upload(fileName, audioBlob, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("Storage upload error in recitation-audio:", error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("recitation-audio")
      .getPublicUrl(data.path || fileName);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.error("Error in uploadRecitationAudio:", err);
    return null;
  }
}

/**
 * Uploads a student avatar image to Supabase Storage and returns the public CDN URL.
 * Automatically targets the 'student-avatars' bucket (with fallback to 'avatars')
 * and sets a 1-year immutable cache-control header for peak CDN performance.
 */
export async function uploadStudentAvatar(
  imageBlob: Blob,
  studentId?: string
): Promise<string | null> {
  if (!imageBlob || imageBlob.size === 0) {
    return null;
  }

  try {
    const supabase = createClient();
    const isJpeg = imageBlob.type === "image/jpeg";
    const ext = isJpeg ? "jpg" : "webp";
    const contentType = imageBlob.type || (isJpeg ? "image/jpeg" : "image/webp");
    const fileName = `${studentId || "student"}_${Date.now()}.${ext}`;

    // Target 'student-avatars' bucket first
    let bucket = "student-avatars";
    let { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, imageBlob, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });

    // Fallback to 'avatars' bucket if 'student-avatars' is not configured
    if (error) {
      bucket = "avatars";
      const fallbackRes = await supabase.storage
        .from(bucket)
        .upload(fileName, imageBlob, {
          contentType,
          cacheControl: "31536000",
          upsert: true,
        });

      if (!fallbackRes.error && fallbackRes.data) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error || !data) {
      console.warn("Storage upload error for avatar:", error?.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path || fileName);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.error("Error in uploadStudentAvatar:", err);
    return null;
  }
}
