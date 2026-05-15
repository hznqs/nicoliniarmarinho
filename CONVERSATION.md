# Histórico de Desenvolvimento — Armarinho ERP
> Última atualização: 2026-05-15

---

## Sessão Atual (2026-05-15)

### 1. Auditoria de Segurança (Pentest)
- **Colisões de ID:** Substituídos todos os `Date.now().toString()` por `crypto.randomUUID()` em `services.ts`
- **NaN no banco:** Corrigidos inputs numéricos em `Compras.tsx` e `Vendas.tsx` para usar `parseFloat(e.target.value) || 0`
- **Mensagens de erro:** Login agora exibe mensagens em português em vez de erros brutos do Supabase
- **Sem vazamento XSS:** Confirmado que não há `dangerouslySetInnerHTML` em nenhum componente

### 2. Multi-Tenancy (Isolamento de dados por usuário)
- Criada função `getCurrentUserId()` em `services.ts` que extrai `user.id` da sessão Supabase
- **Todos os métodos** do `DataService` agora filtram com `.eq('user_id', user_id)`
- Todos os `insert` agora injetam o `user_id` automaticamente
- `getConfig` e `saveConfig` reescritos para operar por `user_id` em vez de `id: 1` fixo

**SQL executado no Supabase:**
```sql
TRUNCATE TABLE vendas, compras, cartoes, fornecedores, config CASCADE;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE cartoes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE config ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE config DROP CONSTRAINT IF EXISTS config_pkey CASCADE;
ALTER TABLE config ADD PRIMARY KEY (user_id);
```

### 3. Motor de Temas — Expansão Total (`src/lib/theme.ts`)
Novas funções adicionadas ao motor de temas:
- `applyBorderRadius(radius)` — sharp / default / rounded
- `applyFontFamily(font)` — Inter / Outfit / Monospace
- `applyDensity(density)` — compact / default / comfortable
- `applySidebarStyle(style)` — glass / solid / minimal
- `saveFullTheme(settings)` — persiste objeto completo no localStorage
- `loadFullTheme()` — carrega configurações salvas com fallback ao DEFAULT_THEME
- `resetTheme()` — restaura todos os valores padrão

### 4. Página de Configurações — Redesign Completo (`src/pages/Configuracoes.tsx`)
Nova estrutura com 6 seções independentes:
1. **Perfil da Loja** — nome e logo com upload e redimensionamento automático
2. **Paletas de Cor** — 8 presets rápidos (Âmbar, Violeta, Esmeralda, Rosa, Azul, Laranja, Ciano, Vermelho) + seletores customizados
3. **Tipografia** — seleção visual entre Inter, Outfit e Monospace
4. **Estilo de Bordas** — Sharp / Padrão / Arredondado com prévia visual
5. **Densidade** — Compacto / Padrão / Confortável com prévia de linhas
6. **Estilo do Menu Lateral** — Glassmorphism / Sólido / Minimal com miniatura visual

---

## Estado Técnico Atual
- **Stack:** React 19 + Vite 8 + Tailwind CSS v4 + Framer Motion + Supabase
- **Build:** ✅ 0 erros TypeScript, bundles otimizados com code-splitting por rota
- **Autenticação:** Supabase Auth com isolamento completo de dados por `user_id`
- **Tema:** Persistido em `localStorage` via `app-full-theme` (JSON unificado)
- **Segurança:** IDs criptográficos, mensagens de erro localizadas, sem XSS

---

## Arquivos Modificados Nesta Sessão
| Arquivo | Modificação |
|---|---|
| `src/lib/theme.ts` | Motor expandido com 7 novas funções e interface `ThemeSettings` |
| `src/lib/services.ts` | Multi-tenancy completo em todos os métodos CRUD |
| `src/pages/Configuracoes.tsx` | Redesign total com 6 seções de personalização |
| `src/pages/Login.tsx` | Mensagens de erro localizadas em português |
| `src/pages/Compras.tsx` | Fix NaN no input de valor |
| `src/pages/Vendas.tsx` | Fix NaN no input de valor |
