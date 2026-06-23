"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetPriceButton({
  photoId,
  currentPrice,
}: {
  photoId: string;
  currentPrice: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState(currentPrice ? String(currentPrice / 100) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/photos/price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId,
          price: price ? Math.round(parseFloat(price) * 100) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update price");

      setEditing(false);
      router.refresh();
    } catch {
      alert("Failed to update price");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
          placeholder="KSh"
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm text-gray-700 hover:text-gray-900"
    >
      {currentPrice
        ? `KSh ${(currentPrice / 100).toLocaleString()}`
        : "Set Price"}
    </button>
  );
}
