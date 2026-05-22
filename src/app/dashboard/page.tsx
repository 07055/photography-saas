import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { PLATFORM_FEE_PERCENT, MIN_PAYOUT_KES } from "@/lib/constants";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatKES(cents: number) {
  return "KSh " + (cents / 100).toLocaleString();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [photos, albums, subscription, orders, subaccount, user] = await Promise.all([
    prisma.photo.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.album.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { photos: true, orders: true } } },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { items: true } },
        album: { select: { name: true } },
      },
    }),
    prisma.subaccount.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    }),
  ]);

  const isAdmin = user?.isAdmin ?? false;

  const storageUsed = subscription?.storageUsed ?? 0;
  const storageLimit = subscription?.storageLimit ?? 0;
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
  const earningsBalance = subscription?.earningsBalance ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">GrapherPeaces</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/gallery"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Gallery
              </Link>
              <Link
                href="/marketplace"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Marketplace
              </Link>
              {storageLimit > 0 && (
                <Link
                  href="/upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Upload Photos
                </Link>
              )}
              <Link
                href="/settings"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Settings
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Admin
                </Link>
              )}
              <span className="text-sm text-gray-600">{session.user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Setup banner if no bank details */}
        {!subaccount && storageLimit === 0 ? (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">
                  Connect your bank to get started
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Add your bank details in Settings. You earn {PLATFORM_FEE_PERCENT}% less
                  (service fee) on every sale, and can withdraw once you reach
                  KSh {MIN_PAYOUT_KES}.
                </p>
              </div>
              <Link
                href="/settings"
                className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 whitespace-nowrap"
              >
                Set Up Payment
              </Link>
            </div>
          </div>
        ) : null}

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Photos</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{photos.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Albums</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{albums.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Orders</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {orders.filter((o) => o.status === "success").length}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Earnings</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatKES(earningsBalance)}
            </p>
            {earningsBalance > 0 && earningsBalance < MIN_PAYOUT_KES * 100 && (
              <p className="text-xs text-gray-500 mt-1">
                {formatKES(MIN_PAYOUT_KES * 100 - earningsBalance)} to next payout
              </p>
            )}
          </div>
        </div>

        {/* Storage bar */}
        {storageLimit > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Storage</span>
              <span>{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Your Albums & Galleries
            </h2>
            {storageLimit > 0 && (
              <Link
                href="/albums/new"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                + New Album
              </Link>
            )}
          </div>

          {albums.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No albums yet.</p>
              {storageLimit > 0 && (
                <Link
                  href="/albums/new"
                  className="mt-4 inline-block text-blue-600 hover:text-blue-500"
                >
                  Create your first album →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {albums.map((album) => (
                <div key={album.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{album.name}</p>
                    <p className="text-sm text-gray-500">
                      {album._count.photos} photos · {album._count.orders} orders
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {album.isPublic ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Public
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Private
                      </span>
                    )}
                    <Link
                      href={`/g/${album.slug}`}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      View Gallery
                    </Link>
                    <CopyButton text={`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/g/${album.slug}`} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Photos</h2>
            </div>

            {photos.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No photos yet.</p>
                {storageLimit > 0 && (
                  <Link
                    href="/upload"
                    className="mt-4 inline-block text-blue-600 hover:text-blue-500"
                  >
                    Upload your first photo →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={photo.thumbUrl}
                      alt={photo.title}
                      className="object-cover w-full h-full"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-sm truncate">{photo.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
            </div>

            {orders.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No orders yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Create a public album with priced photos to start selling.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <div key={order.id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.album?.name} · {order._count.items} photo(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          KSh {(order.amount / 100).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {order.releaseToken && (
                      <div className="mt-2">
                        <CopyButton
                          text={`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/d/${order.releaseToken}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
