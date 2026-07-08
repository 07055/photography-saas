import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export function buildPhotoUrls(publicId: string): {
  originalUrl: string;
  thumbUrl: string;
  watermarkedUrl: string;
} {
  const originalUrl = cloudinary.url(publicId, {
    secure: true,
    flags: "ignore_default_transformations",
  });

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
        overlay: "text:Arial_100_bold:LinkLense",
        color: "white",
        opacity: 60,
        angle: -45,
        gravity: "center",
        width: 800,
        crop: "scale",
      },
      {
        overlay: "text:Arial_60_bold:LinkLense",
        color: "white",
        opacity: 40,
        angle: -45,
        gravity: "south_east",
        x: 40,
        y: 40,
        width: 300,
        crop: "scale",
      },
    ],
  });

  return { originalUrl, thumbUrl, watermarkedUrl };
}
