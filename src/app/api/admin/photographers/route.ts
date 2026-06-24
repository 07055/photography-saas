import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const take = Math.min(Math.max(parseInt(searchParams.get("take") ?? "50", 10) || 50, 1), 200);
    const skip = Math.max(parseInt(searchParams.get("skip") ?? "0", 10) || 0, 0);

    const photographers = await prisma.user.findMany({
      where: { isAdmin: false },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        subaccount: {
          select: { mpesaPhone: true, mpesaName: true },
        },
        subscriptions: {
          select: { earningsBalance: true, storageUsed: true, storageLimit: true },
        },
        _count: {
          select: { photos: true, albums: true, orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });

    return NextResponse.json({ photographers });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch photographers" },
      { status: 500 }
    );
  }
}
