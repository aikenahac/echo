import { withAuth, actionError, ApiError } from "@/lib/api-handler";
import { createApiResponse } from "@/lib/api-auth";
import { generateCollectionCoverUrl } from "@/app/[locale]/actions/collections";
import { UPLOAD_URL_EXPIRES_IN } from "@/lib/s3";
import { isUuid } from "@/lib/utils";

/**
 * POST /api/v1/collections/:id/cover-upload-url
 * Get a presigned S3 URL for uploading a collection cover (owner only). PUT the
 * file to `uploadUrl`, then save `publicUrl` as `coverImageUrl` via
 * PUT /collections/:id.
 * Body: { contentType: "image/jpeg" | "image/png" | "image/webp", fileSize: number }
 */
export const POST = withAuth(async (request, { params }) => {
  const { id } = params;

  if (!isUuid(id)) {
    throw new ApiError("Collection not found", 404);
  }

  const body = await request.json();
  const { contentType, fileSize } = body ?? {};

  const result = await generateCollectionCoverUrl(id, contentType, fileSize);

  if (result.error) {
    throw actionError(result.error);
  }

  return createApiResponse({
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
    expiresIn: UPLOAD_URL_EXPIRES_IN,
  });
});
