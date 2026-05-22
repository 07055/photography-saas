import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processImage } from "@/lib/upload";

export async function POST(req: NextRequest) {
  try {
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

    if (subscription.storageLimit === 0) {
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (subscription.storageUsed + buffer.length > subscription.storageLimit) {
      return NextResponse.json(
        { error: "Storage limit exceeded" },
        { status: 400 }
      );
    }

    const { originalPath, thumbPath, blurredPath, width, height } = await processImage(
      buffer,
      file.type
    );

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;
    const albumId = formData.get("albumId") as string;
    const price = formData.get("price") as string;

    const photo = await prisma.photo.create({
      data: {
        title: title || file.name,
        description: description || null,
        originalUrl: originalPath,
        thumbUrl: thumbPath,
        blurredUrl: blurredPath,
        width,
        height,
        fileSize: buffer.length,
        mimeType: file.type,
        tags: tags || null,
        price: price ? parseInt(price, 10) : null,
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

    const photos = await prisma.photo.findMany({
      where: {
        userId: session.user.id,
        ...(albumId ? { albumId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
