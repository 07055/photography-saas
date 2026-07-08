"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

const FORMAT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  tiff: "image/tiff",
  avif: "image/avif",
};

export default function UploadPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFileToCloudinary = async (file: File, retries = 2): Promise<{
    publicId: string;
    width: number;
    height: number;
    fileSize: number;
    mimeType: string;
    title: string;
  }> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        const res = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Cloudinary upload failed");
        }

        const data = await res.json();

        return {
          publicId: data.public_id,
          width: data.width,
          height: data.height,
          fileSize: data.bytes,
          mimeType: FORMAT_MIME[data.format as string] || "image/jpeg",
          title: data.original_filename,
        };
      } catch (err) {
        if (attempt === retries) throw err;
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }

    throw new Error("Upload failed after retries");
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select at least one file");
      return;
    }

    setUploading(true);
    setError("");
    setProgress(0);

    try {
      const totalFiles = files.length;
      const photoMetas: {
        publicId: string;
        width: number;
        height: number;
        fileSize: number;
        mimeType: string;
        title: string;
      }[] = [];

      for (let i = 0; i < totalFiles; i++) {
        const meta = await uploadFileToCloudinary(files[i]);
        photoMetas.push(meta);
        setProgress(Math.round(((i + 1) / totalFiles) * 80));
      }

      setProgress(85);

      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Untitled",
          price: price ? String(Math.round(parseFloat(price) * 100)) : undefined,
          photos: photoMetas,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create share");
      }

      setProgress(100);
      setShareLink(data.share.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (shareLink) {
    return (
      <div className="min-h-screen bg-surface-muted">
        <nav className="bg-card shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Logo />
            </div>
          </div>
        </nav>

        <main className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-card-foreground mb-2">Upload Complete!</h1>
          <p className="text-muted-foreground mb-6">
            Share this link with your client. It expires in 7 days.
          </p>

          <div className="bg-card rounded-lg shadow p-4 mb-6">
            <a href={shareLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 underline break-all mb-2 block">{shareLink}</a>
            <CopyButton text={shareLink} />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => { setShareLink(null); setFiles([]); setProgress(0); }}
              className="flex-1 py-2 px-4 border border-input-border rounded-md text-sm text-card-foreground hover:bg-surface-muted"
            >
              Upload More
            </button>
            <Link
              href="/dashboard"
              className="flex-1 text-center py-2 px-4 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              Dashboard
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted">
      <nav className="bg-card shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Logo />
            <MobileNav>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-card-foreground"
              >
                Dashboard
              </Link>
              <span className="text-sm text-muted-foreground">{session?.user?.email}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-muted-foreground hover:text-card-foreground"
              >
                Logout
              </Link>
            </MobileNav>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-card-foreground mb-8">
          Upload Photos & Create Share Link
        </h1>

        <form onSubmit={handleUpload} className="bg-card rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Photos
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {files.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                {files.length} file(s) selected — uploading directly to Cloudinary
              </p>
            )}
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-card-foreground">
              Share Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              placeholder="e.g. Jane's Wedding Photos"
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Optional — helps you identify this share later
            </p>
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-card-foreground">
              Price per photo (KSh)
            </label>
            <input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={uploading}
              placeholder="e.g. 50"
              className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-input-bg text-input-text placeholder-input-placeholder"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              All photos in this share have the same price. Leave empty if not for sale.
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="flex-1 text-center py-2 px-4 border border-input-border rounded-md shadow-sm text-sm font-medium text-card-foreground bg-card hover:bg-surface-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {uploading ? `Uploading to Cloudinary (${progress}%)...` : "Upload & Get Share Link"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
