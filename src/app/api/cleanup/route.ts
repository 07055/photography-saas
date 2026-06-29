import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const expiredShares = await prisma.share.findMany({
      where: { expiresAt: { lt: new Date() } },
      select: { id: true, token: true },
    });

    if (expiredShares.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    const ids = expiredShares.map((s) => s.id);

    await prisma.$transaction([
      prisma.photo.deleteMany({ where: { shareId: { in: ids } } }),
      prisma.share.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ deleted: expiredShares.length });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
