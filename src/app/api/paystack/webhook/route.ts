import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { generateToken } from "@/lib/constants";
import { autoPayout } from "@/lib/payout";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const data = event.data as Record<string, unknown>;
    const reference = data.reference as string;

    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { reference },
      select: { id: true },
    });

    if (existingOrder) return NextResponse.json({ received: true });

    try {
      const result = await verifyTransaction(reference);

      if (result.status && result.data.status === "success") {
        const metadataRaw = result.data.metadata;
        const metadata = (typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw) as {
          photoIds: string[];
          shareToken: string;
          shareUserId: string;
          clientName?: string;
          photosTotal?: number;
          platformFee?: number;
        };

        const photos = await prisma.photo.findMany({
          where: { id: { in: metadata.photoIds } },
        });

        const share = await prisma.share.findUnique({
          where: { token: metadata.shareToken },
        });

        if (share) {
          const releaseToken = generateToken();

          await prisma.$transaction(async (tx) => {
            const o = await tx.order.create({
              data: {
                reference,
                email: result.data.email ?? "customer@unknown.com",
                name: metadata.clientName ?? null,
                amount: result.data.amount,
                status: "success",
                paidAt: new Date(result.data.paid_at),
                isReleased: true,
                releaseToken,
                releasedAt: new Date(),
                shareId: share.id,
                userId: metadata.shareUserId,
                items: {
                  create: photos.map((p) => ({
                    photoId: p.id,
                    price: p.price ?? 0,
                  })),
                },
              },
            });

            if (metadata.photosTotal && metadata.shareUserId) {
              await autoPayout(metadata.shareUserId, metadata.photosTotal, o.id, tx);
            }

            return;
          });
        }
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
      return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
