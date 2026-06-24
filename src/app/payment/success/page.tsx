"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function PaymentContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const shareToken = searchParams.get("shareToken");
  const [releaseToken, setReleaseToken] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!reference || !shareToken) return;

    fetch(
      `/api/paystack/verify?reference=${reference}&shareToken=${shareToken}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.releaseToken) setReleaseToken(data.releaseToken);
        else setError(data.error ?? "Verification failed");
      })
      .catch(() => setError("Failed to verify payment"));
  }, [reference, shareToken]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your photos are ready to download.
        </p>
        {releaseToken ? (
          <Link
            href={`/d/${releaseToken}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Download Your Photos
          </Link>
        ) : (
          <p className="text-gray-500">Verifying your payment...</p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
