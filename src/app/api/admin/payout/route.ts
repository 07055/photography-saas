import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id, isAdmin: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { photographerId, amount, phone } = await req.json();

    if (!photographerId || !amount || !phone) {
      return NextResponse.json(
        { error: "Missing photographerId, amount, or phone" },
        { status: 400 }
      );
    }

    const photographer = await prisma.user.findUnique({
      where: { id: photographerId },
      include: { subscriptions: true },
    });

    if (!photographer) {
      return NextResponse.json({ error: "Photographer not found" }, { status: 404 });
    }

    const balance = photographer.subscriptions?.earningsBalance ?? 0;

    if (amount > balance) {
      return NextResponse.json(
        { error: "Amount exceeds earnings balance" },
        { status: 400 }
      );
    }

    // Create payout record and deduct balance
    await Promise.all([
      prisma.payout.create({
        data: {
          amount,
          method: "mpesa",
          phone,
          status: "completed",
          userId: photographerId,
          paidByUserId: session.user.id,
        },
      }),
      prisma.subscription.update({
        where: { userId: photographerId },
        data: { earningsBalance: { decrement: amount } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process payout" },
      { status: 500 }
    );
  }
}
