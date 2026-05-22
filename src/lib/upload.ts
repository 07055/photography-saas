import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ORIGINAL_DIR = path.join(UPLOAD_DIR, "original");
const THUMB_DIR = path.join(UPLOAD_DIR, "thumbs");
const BLUR_DIR = path.join(UPLOAD_DIR, "blurred");

export async function ensureUploadDirs() {
  await fs.mkdir(ORIGINAL_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });
  await fs.mkdir(BLUR_DIR, { recursive: true });
}

export async function processImage(
  buffer: Buffer,
  mimeType: string
): Promise<{
  originalPath: string;
  thumbPath: string;
  blurredPath: string;
  width: number;
  height: number;
}> {
  await ensureUploadDirs();

  const filename = `${uuidv4()}${getExtension(mimeType)}`;
  const originalPath = path.join(ORIGINAL_DIR, filename);
  const thumbPath = path.join(THUMB_DIR, filename);
  const blurredPath = path.join(BLUR_DIR, filename);

  const image = sharp(buffer);
  const metadata = await image.metadata();

  await image.toFile(originalPath);

  const thumbBuffer = await sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  await fs.writeFile(thumbPath, thumbBuffer);

  const pixelSize = Math.max(8, Math.floor((metadata.width ?? 800) / 40));
  const blurredBuffer = await sharp(buffer)
    .resize(pixelSize, undefined, { fit: "cover" })
    .resize(metadata.width ?? 800, undefined, { kernel: "nearest" })
    .jpeg({ quality: 50 })
    .toBuffer();
  await fs.writeFile(blurredPath, blurredBuffer);

  return {
    originalPath: `/uploads/original/${filename}`,
    thumbPath: `/uploads/thumbs/${filename}`,
    blurredPath: `/uploads/blurred/${filename}`,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
  };
}

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".jpg";
  }
}
