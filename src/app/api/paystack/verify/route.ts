import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { generateToken } from "@/lib/constants";
import { autoPayout } from "@/lib/payout";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const albumSlug = searchParams.get("albumSlug");

    if (!reference || !albumSlug) {
      return NextResponse.json(
        { error: "Missing reference or albumSlug" },
        { status: 400 }
      );
    }

    const result = await verifyTransaction(reference);

    if (!result.status || result.data.status !== "success") {
      return NextResponse.json(
        { error: "Payment not successful" },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { reference },
    });

    if (existingOrder) {
      const token = existingOrder.releaseToken ?? generateToken();
      if (!existingOrder.releaseToken) {
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: { releaseToken: token, isReleased: true, releasedAt: new Date() },
        });
      }
      return NextResponse.json({ orderId: existingOrder.id, releaseToken: token });
    }

    const metadata = result.data.metadata as {
      photoIds: string[];
      albumSlug: string;
      albumUserId: string;
      clientName?: string;
      photosTotal?: number;
      platformFee?: number;
    };

    const photos = await prisma.photo.findMany({
      where: { id: { in: metadata.photoIds } },
    });

    const album = await prisma.album.findUnique({
      where: { slug: albumSlug },
    });

    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }

    const releaseToken = generateToken();

    const order = await prisma.order.create({
      data: {
        reference,
        email: result.data.email,
        name: metadata.clientName ?? null,
        amount: result.data.amount,
        status: "success",
        paidAt: new Date(result.data.paid_at),
        isReleased: true,
        releaseToken,
        releasedAt: new Date(),
        albumId: album.id,
        userId: album.userId,
        items: {
          create: photos.map((p) => ({
            photoId: p.id,
            price: p.price ?? 0,
          })),
        },
      },
    });

    // Auto-payout photographer's share via M-Pesa
    if (metadata.photosTotal && album.userId) {
      await autoPayout(album.userId, metadata.photosTotal, order.id);
    }

    return NextResponse.json({ orderId: order.id, releaseToken });
  } catch {
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
