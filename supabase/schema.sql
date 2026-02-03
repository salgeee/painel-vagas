-- Schema para o Painel de Vagas
-- Execute este SQL no Supabase SQL Editor

-- Tabela principal de vagas
CREATE TABLE IF NOT EXISTS vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  escola_codigo TEXT,
  escola TEXT,
  regional TEXT,
  sre_codigo TEXT,
  municipio TEXT,
  data DATE,
  horario TIME,
  endereco TEXT,
  cargo TEXT,
  categoria TEXT,
  natureza TEXT,
  conteudo TEXT,
  nivel TEXT,
  turno TEXT,
  periodo_inicial DATE,
  periodo_final DATE,
  observacoes TEXT,
  url_edital TEXT,
  lat FLOAT,
  lng FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vagas_data ON vagas(data);
CREATE INDEX IF NOT EXISTS idx_vagas_municipio ON vagas(municipio);
CREATE INDEX IF NOT EXISTS idx_vagas_cargo ON vagas(cargo);
CREATE INDEX IF NOT EXISTS idx_vagas_uid ON vagas(uid);

-- Extensão para busca por ILIKE com % (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Índices compostos e trigram para acelerar filtros e ordenação
CREATE INDEX IF NOT EXISTS idx_vagas_data_horario ON vagas(data, horario);
CREATE INDEX IF NOT EXISTS idx_vagas_regional ON vagas(regional);
CREATE INDEX IF NOT EXISTS idx_vagas_categoria ON vagas(categoria);
CREATE INDEX IF NOT EXISTS idx_vagas_turno ON vagas(turno);
CREATE INDEX IF NOT EXISTS idx_vagas_regional_municipio ON vagas(regional, municipio);
CREATE INDEX IF NOT EXISTS idx_vagas_regional_trgm ON vagas USING gin (regional gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vagas_municipio_trgm ON vagas USING gin (municipio gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vagas_cargo_trgm ON vagas USING gin (cargo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vagas_categoria_trgm ON vagas USING gin (categoria gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vagas_turno_trgm ON vagas USING gin (turno gin_trgm_ops);

-- Colunas normalizadas (sem acento e em maiúsculas) para filtros rápidos
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS regional_norm TEXT;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS municipio_norm TEXT;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS cargo_norm TEXT;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS categoria_norm TEXT;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS turno_norm TEXT;

CREATE OR REPLACE FUNCTION normalize_text(input TEXT)
RETURNS TEXT AS $$
  SELECT CASE WHEN input IS NULL THEN NULL ELSE upper(unaccent(input)) END;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION set_vagas_norm_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.regional_norm := normalize_text(NEW.regional);
  NEW.municipio_norm := normalize_text(NEW.municipio);
  NEW.cargo_norm := normalize_text(NEW.cargo);
  NEW.categoria_norm := normalize_text(NEW.categoria);
  NEW.turno_norm := normalize_text(NEW.turno);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_vagas_norm_columns ON vagas;
CREATE TRIGGER set_vagas_norm_columns
  BEFORE INSERT OR UPDATE ON vagas
  FOR EACH ROW
  EXECUTE FUNCTION set_vagas_norm_columns();

UPDATE vagas
SET
  regional_norm = normalize_text(regional),
  municipio_norm = normalize_text(municipio),
  cargo_norm = normalize_text(cargo),
  categoria_norm = normalize_text(categoria),
  turno_norm = normalize_text(turno)
WHERE
  regional_norm IS NULL OR
  municipio_norm IS NULL OR
  cargo_norm IS NULL OR
  categoria_norm IS NULL OR
  turno_norm IS NULL;

CREATE INDEX IF NOT EXISTS idx_vagas_regional_norm ON vagas(regional_norm);
CREATE INDEX IF NOT EXISTS idx_vagas_municipio_norm ON vagas(municipio_norm);
CREATE INDEX IF NOT EXISTS idx_vagas_cargo_norm ON vagas(cargo_norm);
CREATE INDEX IF NOT EXISTS idx_vagas_categoria_norm ON vagas(categoria_norm);
CREATE INDEX IF NOT EXISTS idx_vagas_turno_norm ON vagas(turno_norm);

-- Novos campos para regional/SRE (idempotentes caso já existam)
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS regional TEXT;
ALTER TABLE vagas ADD COLUMN IF NOT EXISTS sre_codigo TEXT;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_vagas_updated_at ON vagas;
CREATE TRIGGER update_vagas_updated_at
  BEFORE UPDATE ON vagas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (anon pode ler)
CREATE POLICY "Vagas são públicas para leitura" ON vagas
  FOR SELECT USING (true);

-- Política para inserção/atualização apenas com service_role
CREATE POLICY "Apenas service_role pode inserir" ON vagas
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Apenas service_role pode atualizar" ON vagas
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Apenas service_role pode deletar" ON vagas
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================
-- Tabela de status do scraping
-- ============================================

CREATE TABLE IF NOT EXISTS scrape_status (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL, -- OK, FONTE_INDISPONIVEL, ESTRUTURA_INVALIDA, SEM_VAGAS, ERRO
  message TEXT,
  vagas_encontradas INTEGER DEFAULT 0,
  http_status INTEGER,
  duration_seconds FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscar o último status rapidamente
CREATE INDEX IF NOT EXISTS idx_scrape_status_created_at ON scrape_status(created_at DESC);

-- Habilitar Row Level Security
ALTER TABLE scrape_status ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (anon pode ler status)
CREATE POLICY "Status é público para leitura" ON scrape_status
  FOR SELECT USING (true);

-- Política para inserção apenas com service_role
CREATE POLICY "Apenas service_role pode inserir status" ON scrape_status
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Cache de geocoding (evita repetir Nominatim para o mesmo endereço)
-- ============================================

CREATE TABLE IF NOT EXISTS geocode_cache (
  address_key TEXT PRIMARY KEY,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geocode_cache_updated_at ON geocode_cache(updated_at);

ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas service_role pode ler/inserir/atualizar cache" ON geocode_cache
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
