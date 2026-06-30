import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import MobileNav from "@/components/MobileNav";

export default async function GalleryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const photos = await prisma.photo.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900 whitespace-nowrap">
                GrapherPeace's
              </Link>
              <div className="hidden sm:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/gallery" className="text-sm font-medium text-blue-600">
                  Gallery
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/upload"
                className="hidden sm:inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Upload Photos
              </Link>
              <MobileNav>
                <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/gallery" className="text-sm font-medium text-blue-600">
                  Gallery
                </Link>
                <Link
                  href="/upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 text-center"
                >
                  Upload Photos
                </Link>
              </MobileNav>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Gallery</h1>

        {photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No photos yet.</p>
            <Link
              href="/upload"
              className="mt-4 inline-block text-blue-600 hover:text-blue-500"
            >
              Upload your first photo →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 shadow hover:shadow-lg transition-shadow"
              >
                <img
                  src={photo.thumbUrl}
                  alt={photo.title}
                  className="object-cover w-full h-full"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {photo.title}
                  </p>
                  {photo.tags && (
                    <p className="text-white/80 text-xs truncate">
                      {photo.tags}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
