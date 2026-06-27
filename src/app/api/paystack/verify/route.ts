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

    let order = await prisma.order.findUnique({
      where: { reference },
      select: { id: true, releaseToken: true },
    });

    if (order) {
      return NextResponse.json({ orderId: order.id, releaseToken: order.releaseToken });
    }

    let result;
    try {
      result = await verifyTransaction(reference);
    } catch (e) {
      console.error("Paystack API call failed:", e);
      return NextResponse.json(
        { error: "Payment verification failed with Paystack" },
        { status: 200 }
      );
    }

    if (!result.status) {
      return NextResponse.json(
        { error: "Payment verification failed with Paystack" },
        { status: 200 }
      );
    }

    if (result.data.status !== "success") {
      return NextResponse.json(
        { error: "Payment not yet successful" },
        { status: 200 }
      );
    }

    const metadataRaw = result.data.metadata;
    if (!metadataRaw) {
      console.error("Missing metadata in Paystack response", JSON.stringify(result.data));
      return NextResponse.json(
        { error: "Payment verification failed - no metadata" },
        { status: 200 }
      );
    }

    let metadata;
    try {
      metadata = (typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw) as {
        photoIds: string[];
        shareToken: string;
        shareUserId: string;
        clientName?: string;
        photosTotal?: number;
        platformFee?: number;
      };
    } catch (e) {
      console.error("Failed to parse metadata:", e, metadataRaw);
      return NextResponse.json(
        { error: "Payment verification failed - invalid metadata" },
        { status: 200 }
      );
    }

    if (!metadata.photoIds || !metadata.shareToken) {
      console.error("Invalid metadata structure:", JSON.stringify(metadata));
      return NextResponse.json(
        { error: "Payment verification failed - incomplete metadata" },
        { status: 200 }
      );
    }

    try {
      order = await prisma.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({
          where: { reference },
          select: { id: true, releaseToken: true },
        });

        if (existing) return existing;

        const photos = await tx.photo.findMany({
          where: { id: { in: metadata.photoIds } },
        });

        const share = await tx.share.findUnique({
          where: { token: metadata.shareToken },
        });

        if (!share) {
          throw new Error("Share not found");
        }

        const releaseToken = generateToken();

        const o = await tx.order.create({
          data: {
            reference,
            email: result.data.email ?? "customer@unknown.com",
            name: metadata.clientName ?? null,
            amount: result.data.amount ?? 0,
            status: "success",
            paidAt: new Date(result.data.paid_at ?? new Date().toISOString()),
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
          try {
            await autoPayout(share.userId, metadata.photosTotal, o.id, tx);
          } catch (payoutErr) {
            console.error("Payout failed (non-fatal):", payoutErr);
          }
        }

        return { id: o.id, releaseToken };
      });
    } catch (e) {
      console.error("Transaction failed:", e);
      const msg = e instanceof Error ? e.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to verify payment", detail: msg },
        { status: 500 }
      );
    }

    return NextResponse.json({ orderId: order.id, releaseToken: order.releaseToken });
  } catch (error) {
    console.error("Unexpected verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
