import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import { Readable } from "stream";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return !!metadata.format && ["jpeg", "png", "webp", "gif", "tiff", "avif"].includes(metadata.format);
  } catch {
    return false;
  }
}

export async function processImage(
  buffer: Buffer,
): Promise<{
  originalPath: string;
  thumbPath: string;
  watermarkedPath: string;
  width: number;
  height: number;
}> {
  const metadata = await sharp(buffer).metadata();
  const imgWidth = metadata.width ?? 800;
  const imgHeight = metadata.height ?? 600;

  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });

  const publicId = result.public_id;

  const thumbUrl = cloudinary.url(publicId, {
    secure: true,
    width: 400,
    height: 400,
    crop: "fit",
    quality: "auto:best",
    format: "jpg",
  });

  const watermarkedUrl = cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 1600, crop: "fit", quality: "auto:best", format: "jpg" },
      {
        overlay: {
          text: "GrapherPeaces",
          font_family: "Arial",
          font_size: 100,
          font_weight: "bold",
        },
        color: "white",
        opacity: 20,
        angle: -45,
        gravity: "center",
        width: 800,
        crop: "scale",
      },
    ],
  });

  return {
    originalPath: result.secure_url,
    thumbPath: thumbUrl,
    watermarkedPath: watermarkedUrl,
    width: imgWidth,
    height: imgHeight,
  };
}
