import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientGallery from "./ClientGallery";

export default async function GalleryPage({
  params,
}: {
  params: { slug: string };
}) {
  const share = await prisma.share.findUnique({
    where: { token: params.slug },
    include: {
      photos: {
        orderBy: { createdAt: "desc" },
      },
      user: { select: { name: true } },
    },
  });

  if (!share) notFound();

  const expired = share.expiresAt < new Date();

  if (expired || share.photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-600">
            This share link has expired. Photos are no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {share.title ?? "Shared Photos"}
          </h1>
          {share.user.name && (
            <p className="mt-1 text-sm text-gray-500">
              by {share.user.name}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Link expires {new Date(share.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ClientGallery
          photos={share.photos.map((p) => ({
            id: p.id,
            title: p.title,
            blurredUrl: p.blurredUrl,
            price: p.price,
          }))}
          shareToken={params.slug}
        />
      </main>
    </div>
  );
}
