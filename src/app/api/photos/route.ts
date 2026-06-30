import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildPhotoUrls } from "@/lib/upload";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`upload:${ip}`, 30, 60000);
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
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
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

    const { publicId, width, height, fileSize, mimeType, title, description, tags, albumId, price: priceRaw } = await req.json();

    if (!publicId || !width || !height || !fileSize || !mimeType) {
      return NextResponse.json(
        { error: "Missing required photo metadata" },
        { status: 400 }
      );
    }

    if (Number(subscription.storageUsed) + fileSize > Number(subscription.storageLimit)) {
      return NextResponse.json(
        { error: "Storage limit exceeded" },
        { status: 400 }
      );
    }

    let price: number | null = null;
    if (priceRaw) {
      price = parseInt(priceRaw, 10);
      if (isNaN(price) || price < 0) {
        return NextResponse.json(
          { error: "Invalid price" },
          { status: 400 }
        );
      }
    }

    if (albumId) {
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { userId: true },
      });
      if (!album || album.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Album not found" },
          { status: 404 }
        );
      }
    }

    const urls = buildPhotoUrls(publicId);

    const photo = await prisma.photo.create({
      data: {
        title: title || publicId,
        description: description || null,
        originalUrl: urls.originalUrl,
        thumbUrl: urls.thumbUrl,
        blurredUrl: urls.watermarkedUrl,
        width,
        height,
        fileSize,
        mimeType,
        tags: tags || null,
        price,
        userId: session.user.id,
        albumId: albumId || null,
      },
    });

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        storageUsed: { increment: fileSize },
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const albumId = searchParams.get("albumId");
    const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "50", 10) || 50, 1), 200);
    const skip = Math.max(parseInt(searchParams.get("skip") ?? "0", 10) || 0, 0);

    const photos = await prisma.photo.findMany({
      where: {
        userId: session.user.id,
        ...(albumId ? { albumId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
