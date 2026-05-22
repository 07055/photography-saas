import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientGallery from "./ClientGallery";

export default async function GalleryPage({
  params,
}: {
  params: { slug: string };
}) {
  const album = await prisma.album.findUnique({
    where: { slug: params.slug, isPublic: true },
    include: {
      photos: {
        where: { price: { not: null } },
        orderBy: { createdAt: "desc" },
      },
      user: { select: { name: true } },
    },
  });

  if (!album) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">{album.name}</h1>
          {album.description && (
            <p className="mt-1 text-gray-600">{album.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            by {album.user.name ?? "Photographer"}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientGallery
          photos={album.photos.map((p) => ({
            id: p.id,
            title: p.title,
            blurredUrl: p.blurredUrl,
            price: p.price,
          }))}
          albumSlug={params.slug}
        />
      </main>
    </div>
  );
}
