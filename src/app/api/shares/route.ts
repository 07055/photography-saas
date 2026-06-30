import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPhotoUrls } from "@/lib/upload";
import { generateShareToken, getBaseUrl } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

const SHARE_EXPIRY_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`share:upload:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    if (Number(subscription.storageLimit) === 0) {
      return NextResponse.json(
        { error: "Set up your payment details in Settings before uploading photos" },
        { status: 400 }
      );
    }

    const subaccount = await prisma.subaccount.findUnique({
      where: { userId: session.user.id },
    });

    if (!subaccount) {
      return NextResponse.json(
        { error: "Set up your payment details in Settings before uploading photos" },
        { status: 400 }
      );
    }

    const { title, price: priceRaw, photos: photoMetas } = await req.json();

    let price: number | null = null;
    if (priceRaw) {
      price = parseInt(priceRaw, 10);
      if (isNaN(price) || price < 0) {
        return NextResponse.json({ error: "Invalid price" }, { status: 400 });
      }
    }

    if (!photoMetas || photoMetas.length === 0) {
      return NextResponse.json({ error: "No photos provided" }, { status: 400 });
    }

    if (photoMetas.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 photos per share" },
        { status: 400 }
      );
    }

    const totalBytes = photoMetas.reduce((sum: number, p: { fileSize: number }) => sum + p.fileSize, 0);

    const storageUsed = Number(subscription.storageUsed);
    const storageLimit = Number(subscription.storageLimit);
    if (storageUsed + totalBytes > storageLimit) {
      return NextResponse.json(
        { error: "Storage limit exceeded" },
        { status: 400 }
      );
    }

    const token = generateShareToken();
    const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    // Create the share record
    const share = await prisma.share.create({
      data: { token, title: title || "Untitled", price, expiresAt, userId: session.user.id },
    });

    // Build photo records from Cloudinary metadata
    const photoData = photoMetas.map((meta: { publicId: string; width: number; height: number; fileSize: number; mimeType: string; title?: string }) => {
      const urls = buildPhotoUrls(meta.publicId);
      return {
        title: meta.title || meta.publicId,
        originalUrl: urls.originalUrl,
        thumbUrl: urls.thumbUrl,
        blurredUrl: urls.watermarkedUrl,
        width: meta.width,
        height: meta.height,
        fileSize: meta.fileSize,
        mimeType: meta.mimeType,
        price,
        userId: session.user.id,
        shareId: share.id,
      };
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.photo.createMany({ data: photoData });
      await tx.subscription.update({
        where: { userId: session.user.id },
        data: { storageUsed: { increment: totalBytes } },
      });
      return tx.share.findUnique({
        where: { id: share.id },
        include: { _count: { select: { photos: true } } },
      });
    });

    const baseUrl = getBaseUrl();

    return NextResponse.json(
      {
        share: {
          id: updated!.id,
          token: updated!.token,
          title: updated!.title,
          photoCount: updated!._count.photos,
          link: `${baseUrl}/g/${updated!.token}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Share upload error:", error);
    return NextResponse.json(
      { error: "Failed to create share" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shares = await prisma.share.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { photos: true, orders: true } },
      },
    });

    const baseUrl = getBaseUrl();

    return NextResponse.json({
      shares: shares.map((s) => ({
        id: s.id,
        token: s.token,
        title: s.title,
        price: s.price,
        expiresAt: s.expiresAt,
        photoCount: s._count.photos,
        orderCount: s._count.orders,
        expired: s.expiresAt < new Date(),
        link: `${baseUrl}/g/${s.token}`,
        createdAt: s.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch shares" }, { status: 500 });
  }
}
