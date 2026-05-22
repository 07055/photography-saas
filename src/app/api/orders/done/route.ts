import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { releaseToken } = await req.json();

    if (!releaseToken) {
      return NextResponse.json(
        { error: "Missing release token" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { releaseToken },
      include: {
        items: {
          include: { photo: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const uploadDir = path.join(process.cwd(), "public");
    let totalFreed = 0;
    const deletedPhotoIds: string[] = [];

    for (const item of order.items) {
      const photo = item.photo;

      // Delete files from disk
      const filesToDelete = [photo.originalUrl, photo.thumbUrl, photo.blurredUrl]
        .filter(Boolean)
        .map((url) => path.join(uploadDir, url!));

      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
        } catch {
          // File may already be deleted
        }
      }

      if (photo.fileSize) totalFreed += photo.fileSize;
      deletedPhotoIds.push(photo.id);
    }

    // Delete the photo records
    await prisma.photo.deleteMany({
      where: { id: { in: deletedPhotoIds } },
    });

    // Free up storage for the photographer
    if (totalFreed > 0) {
      await prisma.subscription.update({
        where: { userId: order.userId },
        data: { storageUsed: { decrement: totalFreed } },
      });
    }

    // Mark order as fulfilled
    await prisma.order.update({
      where: { id: order.id },
      data: { isReleased: false, releaseToken: null },
    });

    return NextResponse.json({ freed: totalFreed, photosDeleted: deletedPhotoIds.length });
  } catch {
    return NextResponse.json(
      { error: "Failed to process completion" },
      { status: 500 }
    );
  }
}
