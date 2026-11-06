"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { uploadPublicFile, type PublicBucket } from "@/lib/storage";
import { errorMessage } from "@/lib/supabase";
import { cn } from "./ui";

/** Sélecteur multi-images : upload immédiat dans Supabase Storage, renvoie la liste d'URLs. */
export function ImageUploader({
  bucket,
  userId,
  folder,
  value,
  onChange,
  max = 6,
  className,
}: {
  bucket: PublicBucket;
  userId: string;
  folder?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const room = max - value.length;
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, room)) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 5 * 1024 * 1024) throw new Error(`${f.name} dépasse 5 Mo`);
        urls.push(await uploadPublicFile(bucket, userId, f, folder));
      }
      onChange([...value, ...urls]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {value.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Couverture</span>}
            <button
              type="button"
              onClick={() => onChange(value.filter((u) => u !== url))}
              className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-white/90 text-red-600 opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Retirer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-xs font-semibold text-muted transition hover:border-primary hover:text-primary",
            )}
          >
            {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
            {busy ? "Envoi…" : "Ajouter"}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        {value.length}/{max} photos · JPG/PNG, 5 Mo max · la 1ʳᵉ photo sert de couverture
      </p>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
    </div>
  );
}
