import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase non configuré. Créez un fichier .env avec :\n" +
    "VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co\n" +
    "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs..."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

/* ── API helpers ───────────────────────────────────────── */

// Charger toutes les données
export async function loadAllData() {
  const [clients, fournisseurs, banques, titres] = await Promise.all([
    supabase.from("clients").select("*").order("nom"),
    supabase.from("fournisseurs").select("*").order("nom"),
    supabase.from("banques").select("*").order("nom"),
    supabase.from("titres").select("*").order("date_echeance", { ascending: false }),
  ]);

  return {
    clients: clients.data || [],
    fournisseurs: fournisseurs.data || [],
    banques: banques.data || [],
    titres: (titres.data || []).map(mapTitreFromDB),
  };
}

// Mapping DB → app (snake_case → camelCase)
function mapTitreFromDB(t) {
  return {
    id: t.id,
    type: t.type,
    sens: t.sens,
    numero: t.numero,
    montant: t.montant,
    dateEmission: t.date_emission,
    dateEcheance: t.date_echeance,
    tierce: t.tierce,
    banque: t.banque,
    statut: t.statut,
    notes: t.notes || "",
  };
}

function mapTitreToDB(t) {
  return {
    type: t.type,
    sens: t.sens,
    numero: t.numero,
    montant: t.montant,
    date_emission: t.dateEmission,
    date_echeance: t.dateEcheance,
    tierce: t.tierce,
    banque: t.banque,
    statut: t.statut,
    notes: t.notes || "",
  };
}

// CRUD Entités
export async function saveEntity(table, e) {
  const payload = { nom: e.nom };
  if (table === "banques") {
    payload.agence = e.agence || "";
    payload.rib = e.rib || "";
  } else {
    payload.ice = e.ice || "";
    payload.tel = e.tel || "";
    payload.email = e.email || "";
    payload.ville = e.ville || "";
  }

  if (e.id && !e.id.startsWith("temp_")) {
    const { error } = await supabase.from(table).update(payload).eq("id", e.id);
    if (error) throw error;
    return e;
  } else {
    const { data, error } = await supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return { ...e, id: data.id };
  }
}

export async function deleteEntity(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// CRUD Titres
export async function saveTitre(t) {
  const payload = mapTitreToDB(t);

  if (t.id && !t.id.startsWith("temp_")) {
    const { error } = await supabase.from("titres").update(payload).eq("id", t.id);
    if (error) throw error;
    return t;
  } else {
    const { data, error } = await supabase.from("titres").insert(payload).select().single();
    if (error) throw error;
    return mapTitreFromDB(data);
  }
}

export async function deleteTitre(id) {
  const { error } = await supabase.from("titres").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTitreStatut(id, statut) {
  const { error } = await supabase.from("titres").update({ statut }).eq("id", id);
  if (error) throw error;
}

/* ── Realtime subscriptions ────────────────────────────── */

export function subscribeAll(onChange) {
  const channels = [
    supabase
      .channel("clients-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => onChange())
      .subscribe(),
    supabase
      .channel("fournisseurs-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "fournisseurs" }, () => onChange())
      .subscribe(),
    supabase
      .channel("banques-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "banques" }, () => onChange())
      .subscribe(),
    supabase
      .channel("titres-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "titres" }, () => onChange())
      .subscribe(),
  ];

  // Retourne une fonction de nettoyage
  return () => channels.forEach(c => supabase.removeChannel(c));
}
