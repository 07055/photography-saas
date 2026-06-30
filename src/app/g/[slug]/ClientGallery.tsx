"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PLATFORM_FEE_PERCENT } from "@/lib/constants";

type GalleryPhoto = {
  id: string;
  title: string;
  blurredUrl: string | null;
  price: number | null;
};

export default function ClientGallery({
  photos,
  shareToken,
}: {
  photos: GalleryPhoto[];
  shareToken: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [releaseToken, setReleaseToken] = useState<string | null>(null);

  const photosTotal =
    photos
      .filter((p) => selected.has(p.id))
      .reduce((sum, p) => sum + (p.price ?? 0), 0);

  const fee = Math.round(photosTotal * PLATFORM_FEE_PERCENT / 100);
  const total = photosTotal + fee;

  const pollPayment = useCallback(async (ref: string, signal: AbortSignal) => {
    const check = async () => {
      if (signal.aborted) return true;
      const res = await fetch(
        `/api/paystack/verify?reference=${ref}&shareToken=${shareToken}`
      );
      const data = await res.json();
      if (data.releaseToken) {
        setReleaseToken(data.releaseToken);
        setLoading(false);
        return true;
      }
      if (data.error && !data.error.includes("not yet successful")) {
        setError(data.error);
        setLoading(false);
        return true;
      }
      return false;
    };

    for (let i = 0; i < 40; i++) {
      if (signal.aborted) return;
      const done = await check();
      if (done) return;
      await new Promise((r) => setTimeout(r, 3000));
    }

    setError("Payment confirmation timed out. Check your M-Pesa messages.");
    setLoading(false);
  }, [shareToken]);

  useEffect(() => {
    if (!reference) return;
    const controller = new AbortController();
    pollPayment(reference, controller.signal);
    return () => controller.abort();
  }, [reference, pollPayment]);

  const togglePhoto = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleCheckout = async () => {
    if (selected.size === 0) {
      setError("Please select at least one photo");
      return;
    }
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!phone) {
      setError("Please enter your M-Pesa phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          phone,
          photoIds: Array.from(selected),
          shareToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Checkout failed");

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setReference(data.reference);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (releaseToken) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
        <p className="text-gray-600 mb-6">Your photos are ready to download.</p>
        <Link
          href={`/d/${releaseToken}`}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Download Your Photos
        </Link>
      </div>
    );
  }

  if (reference) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-6m0 0V6m0 6h6m-6 0H6" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Phone</h2>
        <p className="text-gray-600 mb-2">
          An M-Pesa prompt has been sent to <strong>{phone}</strong>.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Enter your M-Pesa PIN to complete payment. This page will update automatically.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Waiting for payment confirmation...
        </div>
        {error && (
          <p className="mt-4 text-red-600 text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No photos available in this share.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8 select-none" style={{ WebkitTouchCallout: "none" } as React.CSSProperties}>
          {photos.map((photo) => {
            const isSelected = selected.has(photo.id);
            return (
              <button
                key={photo.id}
                onClick={() => togglePhoto(photo.id)}
                onContextMenu={(e) => e.preventDefault()}
                className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition-all ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-transparent hover:border-gray-300"
                }`}
              >
                <img
                  src={photo.blurredUrl ?? ""}
                  alt={photo.title}
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none select-none"
                  style={{ WebkitUserDrag: "none" } as React.CSSProperties}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-2 text-left pointer-events-none">
                  <p className="text-white text-sm font-medium truncate">
                    {photo.title}
                  </p>
                  {photo.price && (
                    <p className="text-white/90 text-xs">
                      KSh {(photo.price / 100).toLocaleString()}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {selected.size} photo(s) selected
              </p>
              <p className="text-sm text-gray-500">
                KSh {(photosTotal / 100).toLocaleString()} + KSh {(fee / 100).toLocaleString()} fee ({PLATFORM_FEE_PERCENT}%)
              </p>
              <p className="text-lg font-bold text-gray-900">
                Total: KSh {(total / 100).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email *"
                  required
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="M-Pesa phone (0712345678) *"
                  required
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading || !email || !phone}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? "Processing..." : "Pay with M-Pesa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
