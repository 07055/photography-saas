import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import DownloadClient from "./DownloadClient";

export default async function DownloadPage({
  params,
}: {
  params: { orderId: string };
}) {
  const session = await getServerSession(authOptions);

  const order = await prisma.order.findUnique({
    where: { id: params.orderId, status: "success" },
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

  // Must be the photographer who owns the order or be logged in as the buyer
  if (!session?.user?.id) {
    redirect(`/d/${order.releaseToken}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Your Purchased Photos
          </h1>
          <p className="mt-1 text-gray-600">
            from {order.album?.name ?? "Gallery"}
          </p>
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
          releaseToken={order.releaseToken ?? ""}
        />
      </main>
    </div>
  );
}
