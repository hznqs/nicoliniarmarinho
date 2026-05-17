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
  favicon_logo TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'tester', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor NUMERIC(15, 2) NOT NULL CHECK (valor >= 0),
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
  limite NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (limite >= 0),
  vencimento INT NOT NULL DEFAULT 10 CHECK (vencimento BETWEEN 1 AND 31),
  fechamento INT NOT NULL DEFAULT 1 CHECK (fechamento BETWEEN 1 AND 31),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "fornecedorId" TEXT REFERENCES fornecedores(id) ON DELETE SET NULL,
  "cartaoId" TEXT REFERENCES cartoes(id) ON DELETE SET NULL,
  "formaPagamento" TEXT NOT NULL DEFAULT 'avista' CHECK ("formaPagamento" IN ('avista', 'cartao', 'boleto')),
  "boletoVencimento" DATE,
  "boletoCodigo" TEXT,
  "boletoPago" BOOLEAN NOT NULL DEFAULT FALSE,
  "boletoDataPagamento" DATE,
  parcelas INT NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 120),
  valor NUMERIC(15, 2) NOT NULL CHECK (valor >= 0),
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
  custo NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (custo >= 0),
  "precoVenda" NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK ("precoVenda" >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venda_itens (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "vendaId" TEXT NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  "produtoId" TEXT NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INT NOT NULL CHECK (quantidade > 0),
  "precoUnitario" NUMERIC(15, 2) NOT NULL CHECK ("precoUnitario" >= 0),
  subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('custo_fixo', 'prolabore', 'distribuicao_lucro')),
  descricao TEXT NOT NULL,
  categoria TEXT,
  valor NUMERIC(15, 2) NOT NULL CHECK (valor >= 0),
  data DATE NOT NULL,
  recorrente BOOLEAN NOT NULL DEFAULT FALSE,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cartao_fatura_pagamentos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "cartaoId" TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  mes TEXT NOT NULL CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  valor NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  "dataPagamento" DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cartao_fatura_pagamentos_unique UNIQUE (user_id, "cartaoId", mes)
);

ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "vendaId" TEXT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "produtoId" TEXT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS quantidade INT;
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS "precoUnitario" NUMERIC(15, 2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS subtotal NUMERIC(15, 2);
ALTER TABLE venda_itens ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE venda_itens ALTER COLUMN "precoUnitario" TYPE NUMERIC(15, 2) USING "precoUnitario"::NUMERIC(15, 2);
ALTER TABLE venda_itens ALTER COLUMN subtotal TYPE NUMERIC(15, 2) USING subtotal::NUMERIC(15, 2);

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
ALTER TABLE config ADD COLUMN IF NOT EXISTS favicon_logo TEXT NOT NULL DEFAULT '';
ALTER TABLE config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS config_user_id_unique ON config(user_id);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'tester', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE vendas ALTER COLUMN valor TYPE NUMERIC(15, 2) USING valor::NUMERIC(15, 2);

ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque INT NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS "estoqueMinimo" INT NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS "precoVenda" NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE produtos ALTER COLUMN custo TYPE NUMERIC(15, 2) USING custo::NUMERIC(15, 2);
ALTER TABLE produtos ALTER COLUMN "precoVenda" TYPE NUMERIC(15, 2) USING "precoVenda"::NUMERIC(15, 2);

ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS digitos TEXT;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS limite NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS vencimento INT NOT NULL DEFAULT 10;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS fechamento INT NOT NULL DEFAULT 1;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cartoes ALTER COLUMN limite TYPE NUMERIC(15, 2) USING limite::NUMERIC(15, 2);

ALTER TABLE compras ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "formaPagamento" TEXT DEFAULT 'avista';
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "boletoVencimento" DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "boletoCodigo" TEXT;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "boletoPago" BOOLEAN DEFAULT FALSE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS "boletoDataPagamento" DATE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS parcelas INT NOT NULL DEFAULT 1;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE compras ALTER COLUMN valor TYPE NUMERIC(15, 2) USING valor::NUMERIC(15, 2);

UPDATE compras
SET "formaPagamento" = CASE
  WHEN "formaPagamento" IS NOT NULL THEN "formaPagamento"
  WHEN "cartaoId" IS NOT NULL THEN 'cartao'
  ELSE 'avista'
END;

UPDATE compras
SET "boletoPago" = FALSE
WHERE "boletoPago" IS NULL;

ALTER TABLE compras ALTER COLUMN "formaPagamento" SET DEFAULT 'avista';
ALTER TABLE compras ALTER COLUMN "formaPagamento" SET NOT NULL;
ALTER TABLE compras ALTER COLUMN "boletoPago" SET DEFAULT FALSE;
ALTER TABLE compras ALTER COLUMN "boletoPago" SET NOT NULL;
ALTER TABLE compras ALTER COLUMN parcelas SET DEFAULT 1;
ALTER TABLE compras ALTER COLUMN parcelas SET NOT NULL;
UPDATE compras SET parcelas = 1 WHERE parcelas IS NULL OR parcelas < 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compras_forma_pagamento_check'
  ) THEN
    ALTER TABLE compras
      ADD CONSTRAINT compras_forma_pagamento_check
      CHECK ("formaPagamento" IN ('avista', 'cartao', 'boleto'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'compras_parcelas_check'
  ) THEN
    ALTER TABLE compras
      ADD CONSTRAINT compras_parcelas_check
      CHECK (parcelas BETWEEN 1 AND 120);
  END IF;
END $$;

ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS valor NUMERIC(15, 2);
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS data DATE;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS observacao TEXT;
ALTER TABLE lancamentos_financeiros ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE lancamentos_financeiros ALTER COLUMN valor TYPE NUMERIC(15, 2) USING valor::NUMERIC(15, 2);

UPDATE lancamentos_financeiros SET recorrente = FALSE WHERE recorrente IS NULL;
ALTER TABLE lancamentos_financeiros ALTER COLUMN recorrente SET DEFAULT FALSE;
ALTER TABLE lancamentos_financeiros ALTER COLUMN recorrente SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lancamentos_financeiros_tipo_check'
  ) THEN
    ALTER TABLE lancamentos_financeiros
      ADD CONSTRAINT lancamentos_financeiros_tipo_check
      CHECK (tipo IN ('custo_fixo', 'prolabore', 'distribuicao_lucro'));
  END IF;
END $$;

ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS "cartaoId" TEXT REFERENCES cartoes(id) ON DELETE CASCADE;
ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS mes TEXT;
ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS valor NUMERIC(15, 2) NOT NULL DEFAULT 0;
ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS "dataPagamento" DATE;
ALTER TABLE cartao_fatura_pagamentos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE cartao_fatura_pagamentos ALTER COLUMN valor TYPE NUMERIC(15, 2) USING valor::NUMERIC(15, 2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cartao_fatura_pagamentos_unique'
  ) THEN
    ALTER TABLE cartao_fatura_pagamentos
      ADD CONSTRAINT cartao_fatura_pagamentos_unique
      UNIQUE (user_id, "cartaoId", mes);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cartao_fatura_pagamentos_mes_check'
  ) THEN
    ALTER TABLE cartao_fatura_pagamentos
      ADD CONSTRAINT cartao_fatura_pagamentos_mes_check
      CHECK (mes ~ '^[0-9]{4}-[0-9]{2}$');
  END IF;
END $$;

-- ==========================================
-- INDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS vendas_user_data_idx ON vendas(user_id, data DESC);
CREATE INDEX IF NOT EXISTS compras_user_data_idx ON compras(user_id, data DESC);
CREATE INDEX IF NOT EXISTS compras_user_pagamento_idx ON compras(user_id, "formaPagamento", data DESC);
CREATE INDEX IF NOT EXISTS fornecedores_user_nome_idx ON fornecedores(user_id, nome);
CREATE INDEX IF NOT EXISTS fornecedores_user_categoria_idx ON fornecedores(user_id, categoria);
CREATE INDEX IF NOT EXISTS cartoes_user_nome_idx ON cartoes(user_id, nome);
CREATE INDEX IF NOT EXISTS produtos_user_nome_idx ON produtos(user_id, nome);
CREATE INDEX IF NOT EXISTS produtos_user_estoque_idx ON produtos(user_id, estoque, "estoqueMinimo");
CREATE INDEX IF NOT EXISTS venda_itens_user_venda_idx ON venda_itens(user_id, "vendaId");
CREATE INDEX IF NOT EXISTS venda_itens_user_produto_idx ON venda_itens(user_id, "produtoId");
CREATE INDEX IF NOT EXISTS lancamentos_financeiros_user_data_idx ON lancamentos_financeiros(user_id, data DESC);
CREATE INDEX IF NOT EXISTS lancamentos_financeiros_user_tipo_idx ON lancamentos_financeiros(user_id, tipo, data DESC);
CREATE INDEX IF NOT EXISTS cartao_fatura_pagamentos_user_mes_idx ON cartao_fatura_pagamentos(user_id, mes DESC);
CREATE INDEX IF NOT EXISTS cartao_fatura_pagamentos_user_cartao_idx ON cartao_fatura_pagamentos(user_id, "cartaoId", mes DESC);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_fatura_pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir acesso total Config" ON config;
DROP POLICY IF EXISTS "Usuários leem seu papel" ON user_roles;
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
DROP POLICY IF EXISTS "Usuários acessam seus lançamentos financeiros" ON lancamentos_financeiros;
DROP POLICY IF EXISTS "Usuários acessam pagamentos de faturas" ON cartao_fatura_pagamentos;

CREATE POLICY "Usuários acessam sua configuração"
  ON config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários leem seu papel"
  ON user_roles FOR SELECT
  USING (auth.uid() = user_id);

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

CREATE POLICY "Usuários acessam seus lançamentos financeiros"
  ON lancamentos_financeiros FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários acessam pagamentos de faturas"
  ON cartao_fatura_pagamentos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- HARDENING MULTIUSUARIO
-- ==========================================
-- RLS isola as linhas por usuario. Os triggers abaixo adicionam uma segunda
-- trava: registros relacionados tambem precisam pertencer ao mesmo usuario.

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'config',
    'user_roles',
    'vendas',
    'fornecedores',
    'cartoes',
    'compras',
    'produtos',
    'venda_itens',
    'lancamentos_financeiros',
    'cartao_fatura_pagamentos'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I CHECK (user_id IS NOT NULL) NOT VALID',
        table_name,
        table_name || '_user_id_required'
      );
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_compras_relationship_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW."fornecedorId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM fornecedores
    WHERE id = NEW."fornecedorId" AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Fornecedor invalido para este usuario.' USING ERRCODE = '42501';
  END IF;

  IF NEW."cartaoId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM cartoes
    WHERE id = NEW."cartaoId" AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cartao invalido para este usuario.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compras_relationship_owner_guard ON compras;
CREATE TRIGGER compras_relationship_owner_guard
  BEFORE INSERT OR UPDATE OF user_id, "fornecedorId", "cartaoId"
  ON compras
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_compras_relationship_owner();

CREATE OR REPLACE FUNCTION public.ensure_venda_itens_relationship_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vendas
    WHERE id = NEW."vendaId" AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Venda invalida para este usuario.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM produtos
    WHERE id = NEW."produtoId" AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Produto invalido para este usuario.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS venda_itens_relationship_owner_guard ON venda_itens;
CREATE TRIGGER venda_itens_relationship_owner_guard
  BEFORE INSERT OR UPDATE OF user_id, "vendaId", "produtoId"
  ON venda_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_venda_itens_relationship_owner();

CREATE OR REPLACE FUNCTION public.ensure_cartao_fatura_relationship_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM cartoes
    WHERE id = NEW."cartaoId" AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cartao invalido para este usuario.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cartao_fatura_relationship_owner_guard ON cartao_fatura_pagamentos;
CREATE TRIGGER cartao_fatura_relationship_owner_guard
  BEFORE INSERT OR UPDATE OF user_id, "cartaoId"
  ON cartao_fatura_pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_cartao_fatura_relationship_owner();

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

-- ==========================================
-- EXEMPLO: DEFINIR PAPEL DE TESTE/ADMIN
-- ==========================================
-- 1) Pegue o id do usuário em Authentication > Users.
-- 2) Troque o UUID abaixo pelo id real e escolha: 'admin', 'tester' ou 'user'.
-- INSERT INTO user_roles (user_id, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'tester')
-- ON CONFLICT (user_id) DO UPDATE
-- SET role = EXCLUDED.role, updated_at = NOW();
