# Segurança do Armarinho ERP

## Antes de atualizar ou publicar

- Rode o SQL completo em `legacy-html/supabase_schema.sql` no Supabase.
- Confirme que o app publicado usa somente o build React (`dist`) e nao a pasta `legacy-html`.
- Mantenha `.env` e `legacy-html/js/env.js` fora do Git.
- Use apenas a chave publica/anon do Supabase no frontend. Nunca use `service_role` no navegador.
- Se alguma chave real ja foi enviada para um repositorio remoto, rotacione a chave no Supabase.

## Protecoes aplicadas

- Row Level Security por `user_id` em todas as tabelas principais.
- Triggers SQL para impedir relacoes entre registros de usuarios diferentes.
- Validacao de datas, IDs, valores monetarios, dias de vencimento e logo.
- Bloqueio de formulas perigosas em exportacao CSV.
- Content Security Policy, Referrer Policy, `nosniff` e permissoes restritas para deploys compativeis com `_headers`.

## Checklist rapido de pentest

- Testar login, cadastro e recuperacao de senha.
- Testar criar/editar/excluir vendas, produtos, compras, boletos, cartoes e financeiro.
- Tentar inserir IDs de outro usuario pelo console do navegador. O Supabase deve recusar.
- Exportar CSV com textos iniciados por `=`, `+`, `-` ou `@`; eles devem sair neutralizados.
