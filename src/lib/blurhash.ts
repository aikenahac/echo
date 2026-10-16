import "server-only";
import sharp from "sharp";
import { encode } from "blurhash";
import { getObjectBytes } from "./s3";

/**
 * Blurhash (https://blurha.sh) of an uploaded image, shown while the full
 * image loads. Returns null when the image can't be read or decoded, so a
 * missing placeholder never blocks saving the image itself.
 */
export async function blurhashForKey(key: string): Promise<string | null> {
  try {
    const bytes = await getObjectBytes(key);
    const { data, info } = await sharp(bytes)
      .resize(32, 32, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
  } catch (error) {
    console.error(`Error generating blurhash for ${key}:`, error);
    return null;
  }
}
