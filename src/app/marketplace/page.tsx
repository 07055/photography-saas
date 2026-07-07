"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "photography-services", label: "Photography Services" },
  { value: "cameras", label: "Cameras" },
  { value: "lenses", label: "Lenses" },
  { value: "lighting", label: "Lighting" },
  { value: "accessories", label: "Accessories" },
  { value: "studios", label: "Studios" },
  { value: "other", label: "Other" },
];

type Ad = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  images: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  location: string | null;
  createdAt: string;
  user: { name: string | null };
};

export default function MarketplacePage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [category, setCategory] = useState("");
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch(`/api/ads${category ? `?category=${category}` : ""}`)
      .then((r) => r.json())
      .then((d) => d.ads && setAds(d.ads))
      .catch(() => {});
  }, [category]);

  const formatKES = (cents: number | null) =>
    cents ? "KSh " + (cents / 100).toLocaleString() : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Logo href="/" />
              <span className="text-sm font-medium text-gray-900">Marketplace</span>
            </div>
            <Link
              href="/marketplace/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Post Ad
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                category === cat.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Ad grid */}
        {ads.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">No ads yet in this category.</p>
            <Link
              href="/marketplace/create"
              className="mt-4 inline-block text-blue-600 hover:text-blue-500"
            >
              Post the first ad →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ads.map((ad) => (
              <button
                key={ad.id}
                onClick={() => setSelectedAd(ad)}
                className="bg-white rounded-lg shadow overflow-hidden text-left hover:shadow-md transition"
              >
                <div className="p-5">
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    {CATEGORIES.find((c) => c.value === ad.category)?.label ??
                      ad.category}
                  </span>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">
                    {ad.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {ad.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    {ad.price ? (
                      <span className="text-lg font-bold text-gray-900">
                        {formatKES(ad.price)}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      {ad.user.name ?? "Photographer"}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Detail modal */}
        {selectedAd && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAd(null)}
          >
            <div
              className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                    {CATEGORIES.find((c) => c.value === selectedAd.category)
                      ?.label ?? selectedAd.category}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-1">
                    {selectedAd.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedAd(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap mb-4">
                {selectedAd.description}
              </p>

              {selectedAd.price && (
                <p className="text-2xl font-bold text-gray-900 mb-4">
                  {formatKES(selectedAd.price)}
                </p>
              )}

              {selectedAd.location && (
                <p className="text-sm text-gray-500 mb-1">
                  Location: {selectedAd.location}
                </p>
              )}

              <div className="border-t pt-4 mt-4">
                <p className="font-medium text-gray-900">Contact</p>
                <p className="text-sm text-gray-600">
                  {selectedAd.contactName}
                </p>
                <a
                  href={`tel:${selectedAd.contactPhone}`}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  {selectedAd.contactPhone}
                </a>
                {selectedAd.contactEmail && (
                  <p className="text-sm text-gray-600">
                    {selectedAd.contactEmail}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedAd(null)}
                className="mt-6 w-full py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
