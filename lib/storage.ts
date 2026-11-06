"use client";

import { getSupabase } from "./supabase";

export type PublicBucket = "animal-photos" | "avatars" | "consultation-photos";

/** Upload dans <bucket>/<userId>/<sous-dossier>/<uuid>.<ext> et renvoie l'URL publique. */
export async function uploadPublicFile(bucket: PublicBucket, userId: string, file: File, folder = ""): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = [userId, folder, `${crypto.randomUUID()}.${ext}`].filter(Boolean).join("/");
  const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Upload d'un document privé (bucket vet-documents) — renvoie le chemin à stocker en base. */
export async function uploadPrivateDocument(userId: string, file: File, folder = ""): Promise<string> {
  const supabase = getSupabase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = [userId, folder, `${crypto.randomUUID()}.${ext}`].filter(Boolean).join("/");
  const { error } = await supabase.storage.from("vet-documents").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

/** URL signée (1 h) pour consulter un document privé. */
export async function signedDocumentUrl(path: string): Promise<string | null> {
  const { data } = await getSupabase().storage.from("vet-documents").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
