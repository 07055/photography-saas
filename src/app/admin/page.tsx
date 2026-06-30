"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Photographer = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  subaccount: {
    mpesaPhone: string | null;
    mpesaName: string | null;
  } | null;
  subscriptions: {
    earningsBalance: number;
    storageUsed: number;
    storageLimit: number;
  } | null;
  _count: {
    photos: number;
    albums: number;
    orders: number;
  };
};

type Payout = {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  user: { name: string | null; email: string };
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [tab, setTab] = useState<"photographers" | "payouts">("photographers");

  useEffect(() => {
    fetch("/api/admin/photographers")
      .then((r) => r.json())
      .then((d) => d.photographers && setPhotographers(d.photographers))
      .catch(() => {});

    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => d.payouts && setPayouts(d.payouts))
      .catch(() => {});
  }, []);

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  if (!session) {
    router.push("/login");
    return null;
  }
  if (!session.user?.isAdmin) {
    router.push("/dashboard");
    return null;
  }

  const formatKES = (cents: number) => "KSh " + (cents / 100).toLocaleString();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Admin</h1>
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab("photographers")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              tab === "photographers"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Photographers
          </button>
          <button
            onClick={() => setTab("payouts")}
            className={`px-4 py-2 rounded text-sm font-medium ${
              tab === "payouts"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border"
            }`}
          >
            Auto-Payout History
          </button>
        </div>

        {tab === "photographers" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Photographers ({photographers.length})
              </h2>
            </div>

            {photographers.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No photographers yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {photographers.map((p) => (
                  <div key={p.id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {p.name ?? "Unnamed"}
                        </p>
                        <p className="text-sm text-gray-500">{p.email}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {p._count.photos} photos · {p._count.albums} albums · {p._count.orders} orders
                        </p>
                        {p.subaccount?.mpesaPhone && (
                          <p className="text-xs text-gray-400">
                            M-Pesa: {p.subaccount.mpesaName} ({p.subaccount.mpesaPhone})
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Earnings</p>
                        <p className="font-bold text-gray-900">
                          {formatKES(p.subscriptions?.earningsBalance ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "payouts" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Auto-Payout History ({payouts.length})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Payouts are sent automatically via Paystack Transfer API when a client pays.
              </p>
            </div>

            {payouts.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No payouts yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payouts.map((p) => (
                  <div key={p.id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {p.user.name ?? p.user.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {formatKES(p.amount)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
