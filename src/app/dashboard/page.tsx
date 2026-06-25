import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import { PLATFORM_FEE_PERCENT, getBaseUrl } from "@/lib/constants";

export const dynamic = "force-dynamic";

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

  const [shares, orders, subscription, subaccount, user] = await Promise.all([
    prisma.share.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { photos: true, orders: true } },
      },
    }),
    prisma.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { items: true } },
        share: { select: { title: true } },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.user.id },
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

  const storageUsed = Number(subscription?.storageUsed ?? 0);
  const storageLimit = Number(subscription?.storageLimit ?? 0);
  const storagePercent = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
  const earningsBalance = subscription?.earningsBalance ?? 0;
  const baseUrl = getBaseUrl();

  const totalPhotos = shares.reduce((sum, s) => sum + s._count.photos, 0);
  const activeShares = shares.filter((s) => s.expiresAt > new Date()).length;

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
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Logout
              </Link>
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
                  Connect your M-Pesa to get started
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Add your M-Pesa details in Settings. A {PLATFORM_FEE_PERCENT}% service fee
                  is added to every sale (the client pays it), and your full earnings
                  are auto-sent to your M-Pesa.
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
            <p className="mt-2 text-3xl font-bold text-gray-900">{totalPhotos}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Active Shares</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">{activeShares}</p>
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
            {earningsBalance > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Auto-paid to your M-Pesa after each sale
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

        {/* Shares */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Your Shares
            </h2>
            {storageLimit > 0 && (
              <Link
                href="/upload"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                + New Share
              </Link>
            )}
          </div>

          {shares.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No shares yet.</p>
              {storageLimit > 0 && (
                <Link
                  href="/upload"
                  className="mt-4 inline-block text-blue-600 hover:text-blue-500"
                >
                  Create your first share link →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {shares.map((s) => (
                <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{s.title ?? "Untitled"}</p>
                      <p className="text-sm text-gray-500">
                        {s._count.photos} photos · {s._count.orders} orders
                      </p>
                    <p className="text-xs text-gray-400">
                      {s.expiresAt > new Date()
                        ? `Expires ${new Date(s.expiresAt).toLocaleDateString()}`
                        : "Expired"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.expiresAt > new Date() ? (
                      <>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Active
                        </span>
                        <Link
                          href={`/g/${s.token}`}
                          className="text-sm text-blue-600 hover:text-blue-500"
                        >
                          View
                        </Link>
                        <CopyButton text={`${baseUrl}/g/${s.token}`} />
                      </>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">No orders yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Create a share with priced photos and send the link to clients.
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
                        {order.share?.title ?? "Share"} · {order._count.items} photo(s)
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
                        text={`${baseUrl}/d/${order.releaseToken}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
