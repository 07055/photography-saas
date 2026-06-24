import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTransaction } from "@/lib/paystack";
import { generateToken } from "@/lib/constants";
import { autoPayout } from "@/lib/payout";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const shareToken = searchParams.get("shareToken");

    if (!reference || !shareToken) {
      return NextResponse.json(
        { error: "Missing reference or shareToken" },
        { status: 400 }
      );
    }

    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { reference },
        select: { id: true, releaseToken: true },
      });

      if (existingOrder) {
        return existingOrder;
      }

      const result = await verifyTransaction(reference);

      if (!result.status || result.data.status !== "success") {
        throw new Error("Payment not successful");
      }

      const metadata = result.data.metadata as {
        photoIds: string[];
        shareToken: string;
        shareUserId: string;
        clientName?: string;
        photosTotal?: number;
        platformFee?: number;
      };

      const photos = await tx.photo.findMany({
        where: { id: { in: metadata.photoIds } },
      });

      const share = await tx.share.findUnique({
        where: { token: shareToken },
      });

      if (!share) {
        throw new Error("Share not found");
      }

      const releaseToken = generateToken();

      const o = await tx.order.create({
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
          shareId: share.id,
          userId: share.userId,
          items: {
            create: photos.map((p) => ({
              photoId: p.id,
              price: p.price ?? 0,
            })),
          },
        },
      });

      if (metadata.photosTotal && share.userId) {
        await autoPayout(share.userId, metadata.photosTotal, o.id, tx);
      }

      return { id: o.id, releaseToken };
    });

    return NextResponse.json({ orderId: order.id, releaseToken: order.releaseToken });
  } catch {
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
