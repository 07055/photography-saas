import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initializeTransaction } from "@/lib/paystack";
import { PLATFORM_FEE_PERCENT, getBaseUrl, formatPhoneToInternational } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const { email, name, phone, photoIds, albumSlug } = await req.json();

    if (!email || !photoIds || !photoIds.length || !albumSlug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        price: { not: null },
        album: { slug: albumSlug },
      },
      include: {
        album: { select: { userId: true, name: true } },
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

    // Add 3% platform fee on top
    const fee = Math.round(photosTotal * PLATFORM_FEE_PERCENT / 100);
    const totalAmount = photosTotal + fee;

    const baseUrl = getBaseUrl();

    const result = await initializeTransaction({
      email,
      amount: totalAmount,
      phone: formatPhoneToInternational(phone ?? ""),
      callbackUrl: `${baseUrl}/payment/success?albumSlug=${albumSlug}`,
      metadata: {
        photoIds,
        albumSlug,
        albumName: photos[0].album?.name,
        albumUserId: photos[0].album?.userId,
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
