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
  const [retrying, setRetrying] = useState(false);

  const verifyPayment = () => {
    if (!reference || !shareToken) return;

    setRetrying(true);
    setError("");

    fetch(
      `/api/paystack/verify?reference=${reference}&shareToken=${shareToken}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.releaseToken) setReleaseToken(data.releaseToken);
        else if (data.error?.includes("not yet successful")) {
          setTimeout(verifyPayment, 3000);
        } else setError(data.error ?? "Verification failed");
      })
      .catch(() => setError("Failed to verify payment"))
      .finally(() => setRetrying(false));
  };

  useEffect(() => {
    if (!reference || !shareToken) return;
    verifyPayment();
  }, [reference, shareToken]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">Your payment may have gone through. Try the download link below.</p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={verifyPayment}
              disabled={retrying}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {retrying ? "Retrying..." : "Retry Verification"}
            </button>
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 underline">
              Go Home
            </Link>
          </div>
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
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Verifying your payment...</p>
          </div>
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
