import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const ads = await prisma.ad.findMany({
      where: {
        status: "active",
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true } },
      },
    });

    return NextResponse.json({ ads });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`ads:create:${ip}`, 5, 60000);
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

    const {
      title,
      description,
      price,
      category,
      images,
      contactName,
      contactPhone,
      contactEmail,
      location,
    } = await req.json();

    if (!title || !description || !category || !contactName || !contactPhone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description,
        price: price ? parseInt(price, 10) : null,
        category,
        images: JSON.stringify(images ?? []),
        contactName,
        contactPhone,
        contactEmail: contactEmail ?? null,
        location: location ?? null,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ ad }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
