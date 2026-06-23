import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const albumSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

async function createUniqueSlug(name: string, userId: string): Promise<string> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "album";

  let suffix = "";
  let attempts = 0;
  while (true) {
    const candidate = slug + suffix;
    const existing = await prisma.album.findUnique({ where: { slug: candidate } });
    if (!existing || existing.userId !== userId) return candidate;
    attempts++;
    suffix = `-${attempts}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, isPublic } = albumSchema.parse(body);

    const slug = await createUniqueSlug(name, session.user.id);

    const album = await prisma.album.create({
      data: {
        name,
        description: description || null,
        isPublic: isPublic ?? false,
        slug,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ album }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create album" },
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

    const albums = await prisma.album.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { photos: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ albums });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}
