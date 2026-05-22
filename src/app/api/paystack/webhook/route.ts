import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { generateToken } from "@/lib/constants";
import { autoPayout } from "@/lib/payout";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";

    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      const existingOrder = await prisma.order.findUnique({
        where: { reference },
      });

      if (existingOrder) return NextResponse.json({ received: true });

      const result = await verifyTransaction(reference);

      if (result.status && result.data.status === "success") {
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
          where: { slug: metadata.albumSlug },
        });

        if (album) {
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
              userId: metadata.albumUserId,
              items: {
                create: photos.map((p) => ({
                  photoId: p.id,
                  price: p.price ?? 0,
                })),
              },
            },
          });

          // Auto-payout photographer's share via M-Pesa
          if (metadata.photosTotal && metadata.albumUserId) {
            await autoPayout(metadata.albumUserId, metadata.photosTotal, order.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
