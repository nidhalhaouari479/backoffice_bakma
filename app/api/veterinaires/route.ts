import { createClient } from "@supabase/supabase-js";

/**
 * Création d'un compte vétérinaire par un administrateur (email + mot de passe + fiche complète).
 * Nécessite SUPABASE_SERVICE_ROLE_KEY (variable serveur, jamais exposée au navigateur).
 * L'appelant doit envoyer son jeton de session : Authorization: Bearer <access_token>.
 */

type Body = {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  clinic_name?: string;
  license_number?: string;
  specialty?: string;
  address?: string;
  bio?: string;
};

const fail = (status: number, error: string) => Response.json({ error }, { status });
const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return fail(500, "SUPABASE_SERVICE_ROLE_KEY manquante : ajoutez-la dans backoffice/.env.local puis redémarrez le serveur.");
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1) L'appelant doit être un administrateur actif
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "Non authentifié.");
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller.user) return fail(401, "Session invalide, reconnectez-vous.");
  const { data: me } = await admin.from("profiles").select("role, status").eq("id", caller.user.id).maybeSingle();
  if (me?.role !== "admin" || me.status !== "actif") return fail(403, "Réservé aux administrateurs.");

  // 2) Validation
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Requête invalide.");
  }
  const email = clean(body.email)?.toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = clean(body.first_name);
  const lastName = clean(body.last_name);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Email invalide.");
  if (password.length < 8) return fail(400, "Le mot de passe doit contenir au moins 8 caractères.");
  if (!firstName || !lastName) return fail(400, "Le prénom et le nom sont obligatoires.");
  const fullName = `${firstName} ${lastName}`;
  const city = clean(body.city);
  const phone = clean(body.phone);

  // 3) Compte Auth (email confirmé : le vétérinaire peut se connecter tout de suite)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, city, phone },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "";
    if (/already|exists|registered/i.test(msg)) return fail(409, "Un compte existe déjà avec cet email.");
    return fail(400, msg || "Création du compte impossible.");
  }
  const id = created.user.id;

  // 4) Profil (créé par le trigger handle_new_user) → rôle vétérinaire + fiche
  try {
    const p = await admin.from("profiles").update({ role: "veterinaire", full_name: fullName, city, bio: clean(body.bio) }).eq("id", id);
    if (p.error) throw p.error;
    const c = await admin.from("profile_contacts").upsert({ id, email, phone });
    if (c.error) throw c.error;
    const v = await admin.from("veterinarians").upsert({
      profile_id: id,
      clinic_name: clean(body.clinic_name),
      license_number: clean(body.license_number),
      specialty: clean(body.specialty),
      address: clean(body.address),
      city,
      is_verified: true,
      verified_at: new Date().toISOString(),
    });
    if (v.error) throw v.error;
  } catch (e) {
    // Annule la création pour ne pas laisser un compte à moitié configuré
    await admin.auth.admin.deleteUser(id);
    return fail(500, (e as { message?: string }).message ?? "Erreur lors de la création de la fiche vétérinaire.");
  }

  return Response.json({ id }, { status: 201 });
}
