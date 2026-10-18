"use client";

import { useRef, useState } from "react";
import { uploadPhoto } from "../actions";
import type { Player } from "@/lib/types";
import Avatar from "@/components/Avatar";

const SIZE = 320;

/** Center-crops to a square and shrinks to a small JPEG so uploads are quick on phones. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    canvas
      .getContext("2d")!
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read photo"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PhotoPicker({ player }: { player: Player }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("id", player.id);
      form.set("photo", new File([await toSquareJpeg(file)], "photo.jpg", { type: "image/jpeg" }));
      const res = await uploadPhoto(form);
      if (res.error) setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={`Change photo for ${player.name}`}
        className="relative"
      >
        <Avatar player={player} size="md" />
        <span className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-stone-blue text-xs text-white ring-2 ring-card">
          {busy ? "…" : "📷"}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onPick(e.target.files?.[0])} />
      {error && <span className="mt-1 max-w-20 text-center text-[11px] text-stone-red">{error}</span>}
    </div>
  );
}
