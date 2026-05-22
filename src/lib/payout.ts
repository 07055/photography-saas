import { prisma } from "@/lib/prisma";
import { initiateTransfer } from "@/lib/paystack";

export async function autoPayout(
  photographerId: string,
  amount: number,
  orderId: string
) {
  if (amount <= 0) return;

  const subaccount = await prisma.subaccount.findUnique({
    where: { userId: photographerId },
  });

  if (!subaccount?.recipientCode || !subaccount.mpesaPhone) return;

  try {
    const result = await initiateTransfer({
      amount,
      recipient: subaccount.recipientCode,
      reason: `Payout for order ${orderId}`,
    });

    // Record the payout
    await prisma.payout.create({
      data: {
        amount,
        method: "mpesa",
        phone: subaccount.mpesaPhone,
        status: result.status ? "completed" : "failed",
        userId: photographerId,
      },
    });
  } catch {
    // Transfer failed — earnings remain as balance
    // Record failed payout for visibility
    await prisma.payout.create({
      data: {
        amount,
        method: "mpesa",
        phone: subaccount.mpesaPhone ?? "",
        status: "failed",
        userId: photographerId,
      },
    });
  }
}
