import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function PATCH(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`price:${ip}`, 30, 60000);
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

    const { photoId, price } = await req.json();

    if (price !== null && price !== undefined && (typeof price !== "number" || price < 0)) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { userId: true },
    });

    if (!photo || photo.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { price: price ?? null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update price" },
      { status: 500 }
    );
  }
}
