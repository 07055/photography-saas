import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { releaseToken } = await req.json();

    if (!releaseToken) {
      return NextResponse.json(
        { error: "Missing release token" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { releaseToken, isReleased: true, status: "success" },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Mark order as fulfilled (photos stay for share expiry cleanup)
    await prisma.order.update({
      where: { id: order.id },
      data: { isReleased: false },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process completion" },
      { status: 500 }
    );
  }
}
