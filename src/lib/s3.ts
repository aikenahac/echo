import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IMAGE_TYPES } from "./image-validation";

// Lazily initialize the S3 client so importing this module never requires
// AWS credentials (e.g. during `next build`)
let s3Client: S3Client | null = null;

function getS3() {
  if (!s3Client) {
    const endpoint = process.env.AWS_S3_ENDPOINT || undefined;
    s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      // S3-compatible providers (Wasabi) need their own endpoint, and
      // path-style URLs (https://<endpoint>/<bucket>/<key>)
      endpoint,
      forcePathStyle: Boolean(endpoint),
      // The SDK's default flexible checksums sign a CRC32 of the empty body
      // into presigned PUT URLs, which non-AWS providers reject
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

const bucketName = () => process.env.AWS_S3_BUCKET_NAME!;
const publicUrl = () => process.env.AWS_S3_PUBLIC_URL!;

async function generateUploadUrl(
  key: string,
  contentType: string,
  fileSize: number,
  acl?: "public-read"
) {
  const command = new PutObjectCommand({
    Bucket: bucketName(),
    Key: key,
    ContentType: contentType,
    // Signed, so the client can only upload exactly the declared size
    ContentLength: fileSize,
    ACL: acl,
  });

  const uploadUrl = await getSignedUrl(getS3(), command, {
    expiresIn: UPLOAD_URL_EXPIRES_IN,
  });

  return {
    uploadUrl,
    publicUrl: `${publicUrl()}/${key}`,
    key,
  };
}

/**
 * Generate a presigned URL for uploading a collection cover image.
 * Callers must validate the input with `validateImageUpload` first
 * (from `@/lib/image-validation`).
 */
export async function generateCollectionCoverUploadUrl(
  userId: string,
  collectionId: string,
  contentType: string,
  fileSize: number
) {
  const key = `${collectionCoverPrefix(userId)}${collectionId}-${Date.now()}.${IMAGE_TYPES[contentType]}`;
  // Make the object publicly readable
  return generateUploadUrl(key, contentType, fileSize, "public-read");
}

/**
 * Generate a presigned URL for uploading a profile picture.
 * Callers must validate the input with `validateImageUpload` first
 * (from `@/lib/image-validation`).
 */
export async function generateProfilePictureUploadUrl(
  userId: string,
  contentType: string,
  fileSize: number
) {
  const key = `${profilePicturePrefix(userId)}${Date.now()}.${IMAGE_TYPES[contentType]}`;
  // Note: ACL omitted to avoid CORS issues - bucket policy makes pfp/ public
  return generateUploadUrl(key, contentType, fileSize);
}

/** True when S3 is configured (it isn't in every dev environment). */
export const s3Configured = () =>
  Boolean(
    process.env.AWS_S3_BUCKET_NAME &&
      process.env.AWS_S3_PUBLIC_URL &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );

/**
 * Upload bytes from the server and return the object's public URL. For
 * server-fetched content only (e.g. mirrored book covers); user uploads go
 * through presigned URLs.
 */
export async function putPublicObject(
  key: string,
  body: Uint8Array,
  contentType: string,
) {
  await getS3().send(
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );
  return `${publicUrl()}/${key}`;
}

/** Presigned upload URLs are valid for 5 minutes */
export const UPLOAD_URL_EXPIRES_IN = 300;

export const collectionCoverPrefix = (userId: string) =>
  `collections/${userId}/`;
export const profilePicturePrefix = (userId: string) => `pfp/${userId}/`;

/**
 * Resolve a public URL to its S3 key, but only if the key lives under `prefix`
 * (i.e. the object belongs to the caller). Returns null otherwise.
 */
export function ownedKeyFromUrl(
  imageUrl: string | null | undefined,
  prefix: string
): string | null {
  if (!imageUrl) return null;
  const base = `${publicUrl()}/`;
  if (!imageUrl.startsWith(base)) return null;
  const key = imageUrl.slice(base.length);
  if (!key.startsWith(prefix) || key.includes("..") || key.includes("?")) {
    return null;
  }
  return key;
}

/** Read an object's bytes from S3 by key. */
export async function getObjectBytes(key: string) {
  const { Body } = await getS3().send(
    new GetObjectCommand({ Bucket: bucketName(), Key: key })
  );
  if (!Body) throw new Error(`Empty S3 object: ${key}`);
  return Body.transformToByteArray();
}

/**
 * Delete an object from S3 by key. Use `ownedKeyFromUrl` to obtain the key.
 */
export async function deleteImage(key: string) {
  await getS3().send(
    new DeleteObjectCommand({
      Bucket: bucketName(),
      Key: key,
    })
  );
}
