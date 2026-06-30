import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLATFORM_FEE_PERCENT, PHOTOGRAPHER_FEE_PERCENT } from "@/lib/constants";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [subscription, subaccount] = await Promise.all([
      prisma.subscription.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.subaccount.findUnique({
        where: { userId: session.user.id },
      }),
    ]);

    return NextResponse.json({
      earningsBalance: subscription?.earningsBalance ?? 0,
      hasSubaccount: !!subaccount,
      subaccountCode: subaccount?.subaccountCode ?? null,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      photographerFeePercent: PHOTOGRAPHER_FEE_PERCENT,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch billing status" },
      { status: 500 }
    );
  }
}
