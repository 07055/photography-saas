import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";
import { PLATFORM_FEE_PERCENT, getBaseUrl, formatPhoneToInternational } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`paystack:init:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${retryAfter} seconds.` },
        { status: 429 }
      );
    }

    const { email, name, phone, photoIds, shareToken } = await req.json();

    if (!email || !photoIds || !photoIds.length || !shareToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const share = await prisma.share.findUnique({
      where: { token: shareToken },
    });

    if (!share) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    if (share.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "This share link has expired" },
        { status: 400 }
      );
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        shareId: share.id,
        price: { not: null },
      },
    });

    if (photos.length !== photoIds.length) {
      return NextResponse.json(
        { error: "Some photos not found or not for sale" },
        { status: 400 }
      );
    }

    const photosTotal = photos.reduce(
      (sum, p) => sum + (p.price ?? 0),
      0
    );

    // Add 1% platform fee on top
    const fee = Math.round(photosTotal * PLATFORM_FEE_PERCENT / 100);
    const totalAmount = photosTotal + fee;

    const baseUrl = getBaseUrl();

    const result = await initializeTransaction({
      email,
      amount: totalAmount,
      phone: formatPhoneToInternational(phone ?? ""),
      callbackUrl: `${baseUrl}/payment/success?shareToken=${shareToken}`,
      metadata: {
        photoIds,
        shareToken,
        shareTitle: share.title,
        shareUserId: share.userId,
        clientName: name,
        clientPhone: phone,
        photosTotal,
        platformFee: fee,
      },
    });

    if (!result.status) {
      return NextResponse.json(
        { error: result.message ?? "Failed to initialize payment" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      reference: result.data.reference,
      authorization_url: result.data.authorization_url || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
