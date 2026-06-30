import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import SetPriceButton from "./SetPriceButton";
import TogglePublicButton from "./TogglePublicButton";
import { getBaseUrl } from "@/lib/constants";

export default async function ManageAlbumPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const album = await prisma.album.findUnique({
    where: { id: params.id, userId: session.user.id },
    include: {
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!album) notFound();

  const baseUrl = getBaseUrl();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900">
            GrapherPeace's
          </Link>
          <div className="flex items-center gap-4">
            {album.isPublic ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                Public — Share: {baseUrl}/g/{album.slug}
              </span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Private
              </span>
            )}
            <TogglePublicButton
              albumId={album.id}
              isPublic={album.isPublic}
            />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{album.name}</h1>
          {album.description && (
            <p className="text-gray-600 mt-1">{album.description}</p>
          )}
        </div>

        {album.photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No photos in this album.</p>
            <Link
              href="/upload"
              className="mt-4 inline-block text-blue-600 hover:text-blue-500"
            >
              Upload photos →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Photos ({album.photos.length})
              </h2>
              <p className="text-sm text-gray-500">
                Set prices for client proofing. Photos without a price won&apos;t
                appear in the public gallery.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {album.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="px-6 py-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={photo.thumbUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {photo.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {photo.fileSize
                        ? `${(photo.fileSize / 1024 / 1024).toFixed(1)} MB`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <SetPriceButton
                      photoId={photo.id}
                      currentPrice={photo.price}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
