"use client";

import { useState } from "react";

type PurchasedPhoto = {
  id: string;
  title: string;
  thumbUrl: string;
  mimeType: string;
};

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/svg+xml": "svg",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/avif": "avif",
};

function extFromMime(mime: string): string {
  return EXT_MAP[mime] || "jpg";
}

export default function DownloadClient({
  photos,
  releaseToken,
}: {
  photos: PurchasedPhoto[];
  releaseToken: string;
  orderId?: string;
}) {
  const [done, setDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");

  const downloadUrl = (photoId: string) =>
    `/api/download?photoId=${photoId}&token=${releaseToken}`;

  const downloadAll = () => {
    photos.forEach((photo, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = downloadUrl(photo.id);
        a.download = `${photo.title}.${extFromMime(photo.mimeType)}`;
        a.click();
      }, i * 500);
    });
  };

  const downloadOne = (photo: PurchasedPhoto) => {
    const a = document.createElement("a");
    a.href = downloadUrl(photo.id);
    a.download = `${photo.title}.${extFromMime(photo.mimeType)}`;
    a.click();
  };

  const handleDone = async () => {
    setCompleting(true);
    setError("");
    try {
      const res = await fetch("/api/orders/done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseToken }),
      });
      if (res.ok) setDone(true);
      else {
        const data = await res.json();
        setError(data.error || "Failed to mark as done");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setCompleting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">All Done!</h2>
        <p className="text-gray-600">Your photos have been downloaded and cleaned up.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {photos.length} photo(s) — Thank you for your purchase!
        </p>
        {photos.length > 1 && (
          <button
            onClick={downloadAll}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Download All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            <div className="aspect-square relative bg-gray-100">
              <img
                src={photo.thumbUrl}
                alt={photo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {photo.title}
              </p>
              <button
                onClick={() => downloadOne(photo)}
                className="mt-2 w-full text-center bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center border-t pt-6">
        <p className="text-sm text-gray-500 mb-3">
          Done downloading? Mark as complete to free up the photographer&apos;s storage.
        </p>
        <button
          onClick={handleDone}
          disabled={completing}
          className="bg-gray-800 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50"
        >
          {completing ? "Cleaning up..." : "Done — Free Up Storage"}
        </button>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
    </div>
  );
}
