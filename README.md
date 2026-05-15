# Armarinho ERP

Sistema React + Supabase para gestão de armarinho: vendas, compras, fornecedores, cartões, produtos, estoque e dashboard financeiro.

## Configuração

1. Crie um arquivo `.env` na raiz do projeto usando `.env.example` como base.
2. Preencha:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

3. Execute o SQL em `legacy-html/supabase_schema.sql` no SQL Editor do Supabase.
4. Instale e rode:

```bash
npm install
npm run dev
```

## Segurança

- O app não usa credenciais Supabase fixas no código.
- As tabelas usam `user_id` e Row Level Security por usuário autenticado.
- Entradas passam por validação e normalização antes de serem enviadas ao Supabase.
- A recuperação de senha usa `resetPasswordForEmail` do Supabase Auth.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
