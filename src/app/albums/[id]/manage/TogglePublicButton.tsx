"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TogglePublicButton({
  albumId,
  isPublic,
}: {
  albumId: string;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [toggling, setToggling] = useState(false);

  const toggle = async () => {
    setToggling(true);
    try {
      const res = await fetch("/api/albums/toggle-public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, isPublic: !isPublic }),
      });

      if (!res.ok) throw new Error("Failed to toggle");

      router.refresh();
    } catch {
      alert("Failed to update");
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
    >
      {toggling ? "..." : isPublic ? "Make Private" : "Make Public"}
    </button>
  );
}
