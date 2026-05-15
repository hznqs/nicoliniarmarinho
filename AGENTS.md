# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React + TypeScript application. Main source code lives in `src/`: `main.tsx` boots the app, `App.tsx` defines top-level routing/composition, `pages/` contains feature screens, `components/` contains reusable UI and layout components, `contexts/` holds React context providers, and `lib/` contains shared services, Supabase setup, and theme helpers. Static public assets belong in `public/`; imported image assets belong in `src/assets/`. `legacy-html/` is kept as reference material, and `dist/` is generated build output.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` runs TypeScript project checks with `tsc -b` and creates the production bundle in `dist/`.
- `npm run lint` runs ESLint across the repository.
- `npm run preview` serves the production build locally for verification.

Install dependencies with `npm install` before running these commands.

## Coding Style & Naming Conventions

Use TypeScript and React function components. Name components and pages in `PascalCase` (`Layout.tsx`, `Dashboard.tsx`) and shared helpers in descriptive camelCase exports. Keep component-specific styling near the component when practical, and use existing utility helpers such as `clsx` and `tailwind-merge` instead of manual class string branching. The project uses ESLint recommended rules, React Hooks rules, React Refresh rules, and TypeScript checks such as `noUnusedLocals` and `noUnusedParameters`; fix lint and type errors before submitting changes.

## Testing Guidelines

No test runner is currently configured. For now, validate changes with `npm run lint`, `npm run build`, and focused manual checks in the affected screens. When adding tests, prefer colocated `*.test.ts` or `*.test.tsx` files and introduce the runner/config in a separate, documented change.

## Commit & Pull Request Guidelines

This repository has no commit history yet, so use clear Conventional Commit-style messages such as `feat: add supplier filters` or `fix: validate login form`. Pull requests should include a short description, affected screens/modules, verification steps, linked issues when available, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Keep secrets out of source control. Store Supabase and environment-specific values in `.env` files and expose only Vite-safe client variables with the expected `VITE_` prefix. Validate user input before sending it to services, avoid rendering untrusted HTML, and review changes in `src/lib/services.ts` for authorization and data exposure risks.
