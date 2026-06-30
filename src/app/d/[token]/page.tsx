import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DownloadClient from "./DownloadClient";

export default async function TokenDownloadPage({
  params,
}: {
  params: { token: string };
}) {
  const order = await prisma.order.findUnique({
    where: { releaseToken: params.token, isReleased: true, status: "success" },
    include: {
      items: {
        include: {
          photo: true,
        },
      },
      album: { select: { name: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Your Purchased Photos
          </h1>
          {order.album?.name && (
            <p className="mt-1 text-gray-600">from {order.album.name}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DownloadClient
          photos={order.items.map((item) => ({
            id: item.photo.id,
            title: item.photo.title,
            thumbUrl: item.photo.thumbUrl,
            mimeType: item.photo.mimeType,
          }))}
          releaseToken={params.token}
          orderId={order.id}
        />
      </main>
    </div>
  );
}
