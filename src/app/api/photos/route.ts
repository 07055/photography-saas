import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processImage, isValidImage } from "@/lib/upload";
import { MAX_UPLOAD_SIZE } from "@/lib/constants";
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

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (!isValidImage(buffer)) {
      return NextResponse.json(
        { error: "File is not a valid image or format is unsupported" },
        { status: 400 }
      );
    }

    // Rough check first using buffer size
    if (Number(subscription.storageUsed) + buffer.length > Number(subscription.storageLimit)) {
      return NextResponse.json(
        { error: "Storage limit exceeded" },
        { status: 400 }
      );
    }

    const { originalPath, thumbPath, watermarkedPath, width, height } = await processImage(
      buffer,
    );

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;
    const albumId = formData.get("albumId") as string;
    const priceRaw = formData.get("price") as string;

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

    const photo = await prisma.photo.create({
      data: {
        title: title || file.name,
        description: description || null,
        originalUrl: originalPath,
        thumbUrl: thumbPath,
        blurredUrl: watermarkedPath,
        width,
        height,
        fileSize: buffer.length,
        mimeType: file.type,
        tags: tags || null,
        price,
        userId: session.user.id,
        albumId: albumId || null,
      },
    });

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        storageUsed: { increment: buffer.length },
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
