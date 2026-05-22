import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ad = await prisma.ad.findUnique({
      where: { id: params.id, status: "active" },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json({ ad });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch ad" },
      { status: 500 }
    );
  }
}
