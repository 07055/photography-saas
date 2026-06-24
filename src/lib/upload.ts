import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const ORIGINAL_DIR = path.join(UPLOAD_DIR, "original");
const THUMB_DIR = path.join(UPLOAD_DIR, "thumbs");
const WATERMARK_DIR = path.join(UPLOAD_DIR, "watermarked");

export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!metadata.format && ["jpeg", "png", "webp", "gif", "tiff", "avif"].includes(metadata.format);
  } catch {
    return false;
  }
}

export async function ensureUploadDirs() {
  await fs.mkdir(ORIGINAL_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });
  await fs.mkdir(WATERMARK_DIR, { recursive: true });
}

const WATERMARK_TEXT = "GrapherPeaces";

function createWatermarkSVG(width: number, height: number): string {
  const fontSize = Math.max(48, Math.floor(width / 8));
  const gapX = Math.floor(width / 2.5);
  const gapY = Math.floor(height / 3);
  const lines: string[] = [];
  lines.push(`<defs><text id="wm" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="rgba(255,255,255,0.35)" stroke="rgba(0,0,0,0.3)" stroke-width="2">${WATERMARK_TEXT}</text></defs>`);
  for (let y = -height; y < height * 2; y += gapY) {
    for (let x = -width; x < width * 2; x += gapX) {
      lines.push(`<use href="#wm" x="${x}" y="${y}" transform="rotate(-35, ${x + fontSize}, ${y})"/>`);
    }
  }
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const bigSize = Math.floor(fontSize * 2.5);
  lines.push(`<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-35, ${cx}, ${cy})" font-family="Arial, sans-serif" font-size="${bigSize}" font-weight="bold" fill="rgba(255,255,255,0.5)" stroke="rgba(0,0,0,0.4)" stroke-width="3">${WATERMARK_TEXT}</text>`);
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${lines.join("")}</svg>`;
}

export async function processImage(
  buffer: Buffer,
  mimeType: string
): Promise<{
  originalPath: string;
  thumbPath: string;
  watermarkedPath: string;
  width: number;
  height: number;
}> {
  await ensureUploadDirs();

  const filename = `${uuidv4()}${getExtension(mimeType)}`;
  const originalPath = path.join(ORIGINAL_DIR, filename);
  const thumbPath = path.join(THUMB_DIR, filename);
  const watermarkedPath = path.join(WATERMARK_DIR, filename);

  const image = sharp(buffer);
  const metadata = await image.metadata();
  const imgWidth = metadata.width ?? 800;
  const imgHeight = metadata.height ?? 600;

  await image.toFile(originalPath);

  const thumbBuffer = await sharp(buffer)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  await fs.writeFile(thumbPath, thumbBuffer);

  const watermarkSVG = createWatermarkSVG(imgWidth, imgHeight);
  const watermarkedBuffer = await sharp(buffer)
    .resize(1600, undefined, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .composite([{ input: Buffer.from(watermarkSVG), top: 0, left: 0 }])
    .toBuffer();
  await fs.writeFile(watermarkedPath, watermarkedBuffer);

  return {
    originalPath: `/uploads/original/${filename}`,
    thumbPath: `/uploads/thumbs/${filename}`,
    watermarkedPath: `/uploads/watermarked/${filename}`,
    width: imgWidth,
    height: imgHeight,
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
