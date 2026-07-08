"use client";

import { useState, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

const CATEGORIES = [
  { value: "photography-services", label: "Photography Services" },
  { value: "cameras", label: "Cameras" },
  { value: "lenses", label: "Lenses" },
  { value: "lighting", label: "Lighting" },
  { value: "accessories", label: "Accessories" },
  { value: "studios", label: "Studios" },
  { value: "other", label: "Other" },
];

export default function CreateAdPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("photography-services");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "loading") return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;
  if (!session) {
    router.push("/login");
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: price || null,
          category,
          images: [],
          contactName,
          contactPhone,
          contactEmail: contactEmail || null,
          location: location || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post ad");

      router.push("/marketplace");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-muted">
      <nav className="bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <Logo href="/" />
              <Link
                href="/marketplace"
                className="text-sm text-muted-foreground hover:text-card-foreground"
              >
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-card-foreground mb-8">Post an Ad</h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-card rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Wedding Photography, Canon EOS R5 for Sale"
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe what you're offering..."
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Price (KES) — optional
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 50000 for KSh 50,000"
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground">
              Location — optional
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Nairobi, Mombasa"
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-medium text-card-foreground mb-4">
              Contact Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground">
                  Your Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                  placeholder="John Doe"
                  className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  required
                  placeholder="0712345678"
                  className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground">
                  Email — optional
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href="/marketplace"
              className="flex-1 text-center py-2 px-4 border border-input-border rounded-md shadow-sm text-sm font-medium text-card-foreground bg-card hover:bg-surface-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post Ad"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
