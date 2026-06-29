import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

function getExtension(mimeType: string): string {
  return EXT_MAP[mimeType] || "jpg";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const photoId = searchParams.get("photoId");
    const token = searchParams.get("token");

    if (!photoId || !token) {
      return new NextResponse("Missing photoId or token", { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { releaseToken: token, isReleased: true, status: "success" },
      include: {
        items: {
          where: { photoId },
          include: { photo: true },
        },
      },
    });

    if (!order || order.items.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const photo = order.items[0].photo;
    const ext = getExtension(photo.mimeType);
    const safeName = photo.title.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${safeName}.${ext}`;

    const cloudinaryRes = await fetch(photo.originalUrl);
    if (!cloudinaryRes.ok) {
      return new NextResponse("Failed to fetch photo", { status: 502 });
    }

    return new NextResponse(cloudinaryRes.body, {
      headers: {
        "Content-Type": photo.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
