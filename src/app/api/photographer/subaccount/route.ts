import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTransferRecipient } from "@/lib/paystack";

// Save M-Pesa payout info
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mpesaPhone, mpesaName } = await req.json();

    if (!mpesaPhone || !mpesaName) {
      return NextResponse.json(
        { error: "Missing M-Pesa phone or name" },
        { status: 400 }
      );
    }

    // Create Paystack transfer recipient for auto-payouts
    const result = await createTransferRecipient({
      name: mpesaName,
      phone: mpesaPhone,
    });

    if (!result.status) {
      return NextResponse.json(
        { error: result.message ?? "Failed to create payout recipient" },
        { status: 400 }
      );
    }

    // Upsert subaccount/payout info
    const subaccount = await prisma.subaccount.upsert({
      where: { userId: session.user.id },
      create: {
        recipientCode: result.data.recipient_code,
        mpesaPhone,
        mpesaName,
        userId: session.user.id,
      },
      update: {
        recipientCode: result.data.recipient_code,
        mpesaPhone,
        mpesaName,
      },
    });

    // Unlock storage if not already done
    await prisma.subscription.updateMany({
      where: { userId: session.user.id, storageLimit: 0 },
      data: { storageLimit: 10737418240, plan: "active" },
    });

    return NextResponse.json({ subaccount });
  } catch {
    return NextResponse.json(
      { error: "Failed to save payout info" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subaccount = await prisma.subaccount.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ subaccount });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch payout info" },
      { status: 500 }
    );
  }
}
