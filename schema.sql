-- ═══════════════════════════════════════════════════════════
-- Chéquier Pro – Schéma Supabase
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- ═══════════════════════════════════════════════════════════

-- 1. Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  ice TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  email TEXT DEFAULT '',
  ville TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des fournisseurs
CREATE TABLE IF NOT EXISTS fournisseurs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  ice TEXT DEFAULT '',
  tel TEXT DEFAULT '',
  email TEXT DEFAULT '',
  ville TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table des banques
CREATE TABLE IF NOT EXISTS banques (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nom TEXT NOT NULL,
  agence TEXT DEFAULT '',
  rib TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Table des titres (chèques / effets)
CREATE TABLE IF NOT EXISTS titres (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL CHECK (type IN ('cheque', 'effet')),
  sens TEXT NOT NULL CHECK (sens IN ('recu', 'emis')),
  numero TEXT NOT NULL,
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  date_emission DATE,
  date_echeance DATE NOT NULL,
  tierce TEXT NOT NULL,
  banque TEXT NOT NULL REFERENCES banques(id) ON DELETE RESTRICT,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'encaisse', 'solde', 'impaye', 'garantie', 'sans_date')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_titres_echeance ON titres(date_echeance);
CREATE INDEX IF NOT EXISTS idx_titres_statut ON titres(statut);
CREATE INDEX IF NOT EXISTS idx_titres_sens ON titres(sens);
CREATE INDEX IF NOT EXISTS idx_titres_tierce ON titres(tierce);
CREATE INDEX IF NOT EXISTS idx_titres_banque ON titres(banque);
CREATE INDEX IF NOT EXISTS idx_clients_nom ON clients(nom);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_nom ON fournisseurs(nom);
CREATE INDEX IF NOT EXISTS idx_banques_nom ON banques(nom);

-- 6. Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
    CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_fournisseurs_updated_at') THEN
    CREATE TRIGGER trg_fournisseurs_updated_at BEFORE UPDATE ON fournisseurs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_banques_updated_at') THEN
    CREATE TRIGGER trg_banques_updated_at BEFORE UPDATE ON banques FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_titres_updated_at') THEN
    CREATE TRIGGER trg_titres_updated_at BEFORE UPDATE ON titres FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- 7. Activer la publication temps réel sur toutes les tables
ALTER PUBLICATION supabase_realtime ADD TABLE clients;
ALTER PUBLICATION supabase_realtime ADD TABLE fournisseurs;
ALTER PUBLICATION supabase_realtime ADD TABLE banques;
ALTER PUBLICATION supabase_realtime ADD TABLE titres;

-- 8. Row Level Security — ouvert (pas d'auth pour le moment)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE banques ENABLE ROW LEVEL SECURITY;
ALTER TABLE titres ENABLE ROW LEVEL SECURITY;

-- Politiques publiques (tout le monde lit/écrit — à restreindre si auth ajoutée)
CREATE POLICY "Enable all for everyone" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for everyone" ON fournisseurs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for everyone" ON banques FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for everyone" ON titres FOR ALL USING (true) WITH CHECK (true);
