import { withAuth, actionError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { generateProfilePictureUploadUrl } from "@/app/[locale]/actions/profile";
import { UPLOAD_URL_EXPIRES_IN } from "@/lib/s3";

/**
 * POST /api/v1/profile/picture-upload-url
 * Get a presigned S3 URL for uploading a profile picture. PUT the file to
 * `uploadUrl` with the same Content-Type, then save `publicUrl` via PUT /profile.
 * Body: { contentType: "image/jpeg" | "image/png" | "image/webp", fileSize: number }
 */
export const POST = withAuth(async (request) => {
  const body = await request.json();
  const { contentType, fileSize } = body ?? {};

  // Same type and size validation as the web upload
  const result = await generateProfilePictureUploadUrl(contentType, fileSize);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse({
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    expiresIn: UPLOAD_URL_EXPIRES_IN,
  });
});
