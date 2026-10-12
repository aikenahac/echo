// Client-safe image upload validation, shared by the upload UI and server actions

/**
 * Allowed image MIME types mapped to the file extension used in the S3 key
 */
export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_IMAGE_SIZE_MB = 5;

export function isValidImageType(fileType: string): boolean {
  return Object.hasOwn(IMAGE_TYPES, fileType);
}

export function isValidImageSize(
  fileSize: number,
  maxSizeMB: number = MAX_IMAGE_SIZE_MB
): boolean {
  return Number.isInteger(fileSize) && fileSize > 0 && fileSize <= maxSizeMB * 1024 * 1024;
}

/**
 * Validate an image upload request. Returns an error message, or null if valid.
 */
export function validateImageUpload(
  contentType: string,
  fileSize: number
): string | null {
  if (!isValidImageType(contentType)) {
    return "Invalid file type. Supported: JPG, PNG, WEBP";
  }
  if (!isValidImageSize(fileSize)) {
    return `File too large. Maximum size: ${MAX_IMAGE_SIZE_MB}MB`;
  }
  return null;
}
