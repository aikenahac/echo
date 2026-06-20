import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { s3Client, BUCKET_NAME } from "@/lib/s3";

const MAX_BYTES = 5 * 1024 * 1024;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  if (path.some((segment) => segment === ".." || segment === "")) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const key = path.join("/");

  try {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );

    if (response.ContentLength && response.ContentLength > MAX_BYTES) {
      return new NextResponse("File too large", { status: 413 });
    }

    if (!response.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": response.ContentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    });

    if (response.ContentLength) {
      headers.set("Content-Length", String(response.ContentLength));
    }

    return new NextResponse(response.Body.transformToWebStream(), { headers });
  } catch (error: unknown) {
    if ((error as { name?: string })?.name === "NoSuchKey") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("CDN proxy error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
