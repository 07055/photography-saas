"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaName, setMpesaName] = useState("");
  const [existing, setExisting] = useState<{
    mpesaPhone: string | null;
    mpesaName: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/photographer/subaccount")
      .then((r) => r.json())
      .then((d) => {
        if (d.subaccount) {
          setExisting({
            mpesaPhone: d.subaccount.mpesaPhone ?? null,
            mpesaName: d.subaccount.mpesaName ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/photographer/subaccount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpesaPhone, mpesaName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save");
      }

      setSuccess("Payout info saved! Earnings will be auto-sent to your M-Pesa.");
      setExisting({ mpesaPhone, mpesaName });
      setMpesaPhone("");
      setMpesaName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                GrapherPeaces
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <span className="text-sm text-gray-600">{session.user?.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            M-Pesa Payout Settings
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Add your M-Pesa number. After every sale, your earnings will be
            automatically sent here — no need to wait for manual payouts.
          </p>

          {existing ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="font-medium text-green-800">Payout Active</p>
              <p className="text-sm text-green-700 mt-1">
                {existing.mpesaName} — {existing.mpesaPhone}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Earnings are auto-sent to this M-Pesa after each sale.
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                required
                placeholder="0712345678"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name on M-Pesa Account
              </label>
              <input
                type="text"
                value={mpesaName}
                onChange={(e) => setMpesaName(e.target.value)}
                required
                placeholder="John Doe"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Payout Info"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            How it works
          </h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• A {PLATFORM_FEE_PERCENT}% service fee is added on top of every sale</li>
            <li>• Client pays: your price + {PLATFORM_FEE_PERCENT}% (e.g. KSh 1000 → client pays KSh 1030)</li>
            <li>• Your full price is auto-sent to your M-Pesa after each sale</li>
            <li>• The {PLATFORM_FEE_PERCENT}% fee stays with the platform</li>
            <li>• Minimum KSh 10 payout — no minimum, actually! Every sale pays out immediately</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
