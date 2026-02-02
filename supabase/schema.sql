-- Schema para o Painel de Vagas
-- Execute este SQL no Supabase SQL Editor

-- Tabela principal de vagas
CREATE TABLE IF NOT EXISTS vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL,
  escola_codigo TEXT,
  escola TEXT,
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
