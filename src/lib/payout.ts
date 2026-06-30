import { prisma } from "@/lib/prisma";
import { initiateTransfer } from "@/lib/paystack";

type TxClient = {
  subaccount: { findUnique: typeof prisma.subaccount.findUnique };
  payout: { create: typeof prisma.payout.create; update: typeof prisma.payout.update };
};

export async function autoPayout(
  photographerId: string,
  amount: number,
  orderId: string,
  tx?: TxClient
) {
  if (amount <= 0) return;

  const db = tx ?? prisma;

  const subaccount = await db.subaccount.findUnique({
    where: { userId: photographerId },
  });

  if (!subaccount?.recipientCode || !subaccount.mpesaPhone) return;

  const payout = await db.payout.create({
    data: {
      amount,
      method: "mpesa",
      phone: subaccount.mpesaPhone ?? "",
      status: "pending",
      userId: photographerId,
    },
  });

  try {
    const result = await initiateTransfer({
      amount,
      recipient: subaccount.recipientCode,
      reason: `Payout for order ${orderId}`,
    });

    await db.payout.update({
      where: { id: payout.id },
      data: { status: result.status ? "completed" : "failed" },
    });

    if (!result.status) {
      console.error(`Payout failed for photographer ${photographerId}, order ${orderId}: ${result.message}`);
    }
  } catch (err) {
    console.error(`Payout exception for photographer ${photographerId}, order ${orderId}:`, err);
    await db.payout.update({
      where: { id: payout.id },
      data: { status: "failed" },
    });
  }
}