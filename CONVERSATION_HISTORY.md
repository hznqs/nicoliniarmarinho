# Armarinho ERP - Histórico de Evolução e Plano de Migração

Este documento contém o resumo da evolução do projeto **Armarinho ERP** e o status atual da migração para uma stack de alta performance (**React + Vite + Tailwind CSS**).

## 🚀 Status Atual
- **Stack Legada**: HTML/CSS/JS Vanilla (arquivos movidos para a pasta `/legacy-html`).
- **Nova Stack**: Vite + React + TypeScript (em fase de inicialização).
- **Dependências Instaladas**: Supabase, React Router, Lucide React, Framer Motion, Tailwind CSS.

## 📋 Resumo das Funcionalidades Implementadas (Versão Legada)
1. **Autenticação**: Sistema de Login e Registro com Supabase, incluindo funcionalidade "Lembrar-me".
2. **Dashboard**: Gráficos premium (`Chart.js`) com gradientes, estatísticas de vendas, compras e saldo mensal.
3. **Gestão de Cartões**: Cadastro de cartões e visualização detalhada de fatura com filtro por mês.
4. **Gestão de Fornecedores**: Cadastro com campo de "Descrição/Observação" e listagem dinâmica.
5. **Vendas e Compras**: Fluxo completo de lançamento e exclusão de transações.
6. **Exportação**: Função global para exportar tabelas (Faturas, Vendas, Compras, Fornecedores) para Excel/CSV.

## 🛠 Plano de Reescrita (Para Próxima Sessão)

Ao retomar, os passos recomendados são:

### 1. Configuração de Estilo
- Configurar o `tailwind.config.js` com a paleta de cores Premium (Gold/Zinc).
- Criar os componentes de base: `Button`, `Input`, `Card`, `Modal`.

### 2. Arquitetura de Dados
- Criar o hook `useSupabase` ou um contexto de autenticação para gerenciar a sessão do usuário.
- Portar as funções do `store.js` para um serviço centralizado ou hooks do React Query para cache e velocidade.

### 3. Migração de Telas
1. **Login/Register**: Implementar a tela de entrada com as animações do Framer Motion.
2. **Layout Principal**: Criar a Sidebar e Topbar como componentes globais.
3. **Dashboard**: Reimplementar os gráficos usando `Recharts` (mais otimizado para React que o Chart.js puro).
4. **Módulos**: Migrar sucessivamente Fornecedores -> Cartões -> Compras -> Vendas.

## 🔑 Dados de Conexão
As credenciais do Supabase (URL e Anon Key) estão configuradas no ambiente. Certifique-se de criar um arquivo `.env` na nova estrutura React com essas chaves para que a aplicação se conecte ao banco de dados existente.

---
**Data do Backup**: 14 de Maio de 2026
**Objetivo**: Performance 100% e UX nível SaaS Global.
