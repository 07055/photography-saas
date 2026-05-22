import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { photoId, price } = await req.json();

    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      select: { userId: true },
    });

    if (!photo || photo.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.photo.update({
      where: { id: photoId },
      data: { price: price ?? null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update price" },
      { status: 500 }
    );
  }
}
