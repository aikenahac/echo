import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const PUBLIC_URL = process.env.AWS_S3_PUBLIC_URL!;

/**
 * Generate a presigned URL for uploading a collection cover image
 * @param userId - The user's ID
 * @param collectionId - The collection's ID
 * @param fileExtension - File extension (e.g., 'jpg', 'png')
 * @returns Object with presigned URL and the final public URL
 */
export async function generateCollectionCoverUploadUrl(
  userId: string,
  collectionId: string,
  fileExtension: string = "jpg"
) {
  const timestamp = Date.now();
  const key = `collections/${userId}/${collectionId}-${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: `image/${fileExtension}`,
    // Make the object publicly readable
    ACL: "public-read",
  });

  // Generate presigned URL (valid for 5 minutes)
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  // Construct the final public URL
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return {
    uploadUrl,
    publicUrl,
    key,
  };
}

/**
 * Delete a collection cover image from S3
 * @param imageUrl - The public URL of the image to delete
 */
export async function deleteCollectionCover(imageUrl: string) {
  try {
    // Extract the key from the public URL
    const key = imageUrl.replace(`${PUBLIC_URL}/`, "");

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Deleted image: ${key}`);
  } catch (error) {
    console.error("Error deleting image from S3:", error);
    throw error;
  }
}

/**
 * Validate file type for collection covers
 * @param fileType - MIME type of the file
 * @returns Boolean indicating if the file type is valid
 */
export function isValidImageType(fileType: string): boolean {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  return validTypes.includes(fileType);
}

/**
 * Validate file size for collection covers
 * @param fileSize - Size of the file in bytes
 * @param maxSizeMB - Maximum allowed size in MB (default: 5MB)
 * @returns Boolean indicating if the file size is valid
 */
export function isValidImageSize(
  fileSize: number,
  maxSizeMB: number = 5
): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
}
