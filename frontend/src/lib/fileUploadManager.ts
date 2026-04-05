import { supabase } from "./supabase";

const MAX_FILE_SIZE = 500 * 1024; // 500 KB
const STORAGE_BUCKET = "invoice-files";
const CACHE_CONTROL = "31536000"; // 1 year

/**
 * Compress image file to reduce size
 * Returns compressed blob, original if already small
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1440,
  quality: number = 0.8,
): Promise<Blob> {
  // If already small, return original
  if (file.size < MAX_FILE_SIZE) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");

        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          quality,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload file to Supabase Storage
 * Uses user_id for isolation
 */
export async function uploadInvoiceFile(
  userId: string,
  file: File,
): Promise<string> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // Compress if image
    let fileToUpload = file;
    if (file.type.startsWith("image/")) {
      const compressed = await compressImage(file);
      fileToUpload = new File([compressed], file.name, {
        type: "image/jpeg",
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${random}-${file.name}`;
    const path = `${userId}/${filename}`;

    // Upload to storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, fileToUpload, {
        cacheControl: CACHE_CONTROL,
        upsert: false,
      });

    if (error) throw error;

    // Generate public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

    return publicUrl;
  } catch (error: any) {
    console.error("File upload failed:", error);
    throw new Error(error.message || "Failed to upload file");
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteInvoiceFile(fileUrl: string): Promise<void> {
  try {
    // Extract path from public URL
    const url = new URL(fileUrl);
    const [, , , ...pathParts] = url.pathname.split("/");
    const path = pathParts.join("/");

    if (!path) {
      throw new Error("Invalid file URL");
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) throw error;
  } catch (error: any) {
    console.error("File deletion failed:", error);
    throw new Error(error.message || "Failed to delete file");
  }
}

/**
 * Queue file deletion for async processing
 * Used by edge functions for cleanup
 */
export async function queueFileForDeletion(
  fileUrl: string,
  userId: string,
): Promise<void> {
  try {
    // Extract path from public URL
    const url = new URL(fileUrl);
    const [, , , ...pathParts] = url.pathname.split("/");
    const path = pathParts.join("/");

    if (!path) {
      throw new Error("Invalid file URL");
    }

    // Add to deletion queue
    const { error } = await supabase.from("storage_delete_queue").insert({
      file_path: path,
      user_id: userId,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
  } catch (error: any) {
    console.error("Failed to queue file for deletion:", error);
    throw new Error(error.message || "Failed to queue file deletion");
  }
}

/**
 * Validate file before upload
 */
export function validateInvoiceFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  const validTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Use PDF or image (JPG, PNG, WebP)",
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    // 10 MB
    return { valid: false, error: "File too large (max 10 MB)" };
  }

  return { valid: true };
}
