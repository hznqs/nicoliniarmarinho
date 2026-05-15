-- ==========================================
-- SCHEMA SEGURO DO ARMARINHO ERP (SUPABASE)
-- ==========================================
-- Execute no SQL Editor do Supabase.
-- As tabelas usam user_id + Row Level Security para isolar os dados por conta.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- TABELAS
-- ==========================================

CREATE TABLE IF NOT EXISTS config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Armarinho',
  logo TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
  data DATE NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fornecedores (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cartoes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  digitos TEXT,
  limite NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (limite >= 0),
  vencimento INT NOT NULL DEFAULT 10 CHECK (vencimento BETWEEN 1 AND 31),
  fechamento INT NOT NULL DEFAULT 1 CHECK (fechamento BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "fornecedorId" TEXT REFERENCES fornecedores(id) ON DELETE SET NULL,
  "cartaoId" TEXT REFERENCES cartoes(id) ON DELETE SET NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor >= 0),
  data DATE NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  sku TEXT,
  categoria TEXT,
  estoque INT NOT NULL DEFAULT 0 CHECK (estoque >= 0),
  "estoqueMinimo" INT NOT NULL DEFAULT 0 CHECK ("estoqueMinimo" >= 0),
  custo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
  "precoVenda" NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK ("precoVenda" >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "vendaId" TEXT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  "produtoId" TEXT NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INT NOT NULL CHECK (quantidade > 0),
  "precoUnitario" NUMERIC(12, 2) NOT NULL CHECK ("precoUnitario" >= 0),
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "vendaId" TEXT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "produtoId" TEXT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS quantidade INT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "precoUnitario" NUMERIC(12, 2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Garante relacionamentos em bancos que já tinham a tabela criada sem FKs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venda_itens_venda_id_fkey'
  ) THEN
    ALTER TABLE venda_itens
      ADD CONSTRAINT venda_itens_venda_id_fkey
      FOREIGN KEY ("vendaId") REFERENCES vendas(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venda_itens_produto_id_fkey'
  ) THEN
    ALTER TABLE venda_itens
      ADD CONSTRAINT venda_itens_produto_id_fkey
      FOREIGN KEY ("produtoId") REFERENCES produtos(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ==========================================
-- MIGRACAO DE PROJETOS ANTIGOS
-- ==========================================

ALTER TABLE config ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS config_user_id_unique ON config(user_id);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS digitos TEXT;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS limite NUMERIC(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS vencimento INT NOT NULL DEFAULT 10;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS fechamento INT NOT NULL DEFAULT 1;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE compras ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ==========================================
-- INDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS vendas_user_data_idx ON vendas(user_id, data DESC);
CREATE INDEX IF NOT EXISTS compras_user_data_idx ON compras(user_id, data DESC);
CREATE INDEX IF NOT EXISTS fornecedores_user_nome_idx ON fornecedores(user_id, nome);
CREATE INDEX IF NOT EXISTS fornecedores_user_categoria_idx ON fornecedores(user_id, categoria);
CREATE INDEX IF NOT EXISTS cartoes_user_nome_idx ON cartoes(user_id, nome);
CREATE INDEX IF NOT EXISTS produtos_user_nome_idx ON produtos(user_id, nome);
CREATE INDEX IF NOT EXISTS produtos_user_estoque_idx ON produtos(user_id, estoque, "estoqueMinimo");
CREATE INDEX IF NOT EXISTS venda_itens_user_venda_idx ON venda_itens(user_id, "vendaId");
CREATE INDEX IF NOT EXISTS venda_itens_user_produto_idx ON venda_itens(user_id, "produtoId");

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total Config" ON config;
DROP POLICY IF EXISTS "Permitir acesso total Vendas" ON vendas;
DROP POLICY IF EXISTS "Permitir acesso total Fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Permitir acesso total Cartões" ON cartoes;
DROP POLICY IF EXISTS "Permitir acesso total Compras" ON compras;

DROP POLICY IF EXISTS "Usuários acessam sua configuração" ON config;
DROP POLICY IF EXISTS "Usuários acessam suas vendas" ON vendas;
DROP POLICY IF EXISTS "Usuários acessam seus fornecedores" ON fornecedores;
DROP POLICY IF EXISTS "Usuários acessam seus cartões" ON cartoes;
DROP POLICY IF EXISTS "Usuários acessam suas compras" ON compras;
DROP POLICY IF EXISTS "Usuários acessam seus produtos" ON produtos;
DROP POLICY IF EXISTS "Usuários acessam itens de suas vendas" ON venda_itens;

CREATE POLICY "Usuários acessam sua configuração"
  ON config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam suas vendas"
  ON vendas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam seus fornecedores"
  ON fornecedores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam seus cartões"
  ON cartoes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam suas compras"
  ON compras FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam seus produtos"
  ON produtos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam itens de suas vendas"
  ON venda_itens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pede ao PostgREST/Supabase para recarregar o cache de relacionamentos.
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- DIAGNOSTICO RAPIDO
-- ==========================================
-- Esta consulta deve retornar as colunas:
-- id, user_id, vendaId, produtoId, quantidade, precoUnitario, subtotal, created_at
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'venda_itens'
ORDER BY ordinal_position;

-- Esta consulta deve retornar as FKs venda_itens -> vendas/produtos.
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'venda_itens';
