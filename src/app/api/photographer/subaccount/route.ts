import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTransferRecipient } from "@/lib/paystack";
import { formatPhoneToInternational } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

// Save M-Pesa payout info
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const { allowed, retryAfter } = checkRateLimit(`subaccount:${ip}`, 3, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${retryAfter} seconds.` },
        { status: 429 }
      );
    }

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

    // Try to create Paystack transfer recipient for auto-payouts
    let recipientCode: string | null = null;
    try {
      const result = await createTransferRecipient({
        name: mpesaName,
        phone: mpesaPhone,
      });
      if (result.status) {
        recipientCode = result.data.recipient_code;
      } else {
        console.warn("Paystack createTransferRecipient failed (test mode?):", result.message);
      }
    } catch (e) {
      console.warn("Paystack createTransferRecipient threw (test mode?):", e);
    }

    // Upsert subaccount/payout info - store in international format
    const internationalPhone = formatPhoneToInternational(mpesaPhone);
    const subaccount = await prisma.subaccount.upsert({
      where: { userId: session.user.id },
      create: {
        recipientCode,
        mpesaPhone: internationalPhone,
        mpesaName,
        userId: session.user.id,
      },
      update: {
        recipientCode: recipientCode ?? undefined,
        mpesaPhone: internationalPhone,
        mpesaName,
      },
    });

    // Unlock storage if not already done
    await prisma.subscription.updateMany({
      where: { userId: session.user.id, storageLimit: 0 },
      data: { storageLimit: 10737418240, plan: "active" },
    });

    return NextResponse.json({ subaccount });
  } catch (error) {
    console.error("Subaccount save error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save payout info" },
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
