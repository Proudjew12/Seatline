# Seatline frontend instructions

These instructions apply inside the Seatline `frontend/` application and refine the repository-level rules.

## Independence

- This folder must remain installable, runnable, buildable, and copyable without `backend/` or root scripts.
- Never import backend source code or rely on paths outside this folder for runtime behavior.
- Access backend capabilities only through the configured HTTP API.

## Structure

- Keep build/lint/test configuration in `config/`; preserve the root `tsconfig.json` for editor
  project discovery. Resolve configuration paths relative to their new locations.
- Keep browser tests in `tests/`. Store screenshots, traces, and reports outside this repository.
- Keep `src/main.tsx` and `src/app/App.tsx` as composition only.
- Put route-level composition in `src/pages`.
- Put business UI in `src/features/<feature>` with its API functions, components, hooks, and types.
- Create domain-named feature folders with only the files needed for their behavior. Keep the
  `health` feature as an operational API check.
- Put reusable visual primitives and layouts in `src/components`; they must not contain feature rules.
- Put low-level configuration, transport, formatting, and pure helpers in `src/shared`.
- Put broadly reused pure functions in purpose-specific modules under `src/shared/utils`. Use `.ts`
  unless a file actually renders JSX, and import modules directly rather than adding a barrel file.
- Use direct imports rather than barrel `index.ts` files.

## SCSS standard

- Use SCSS Modules for component and page styles: `Component.module.scss` beside `Component.tsx`.
- Import the single global entry only from `src/main.tsx`: `@/styles/main.scss`.
- Keep Sass variables, maps, functions, and mixins under `src/styles/abstracts`.
- Keep runtime design tokens as CSS custom properties emitted by `src/styles/_tokens.scss`.
- Use explicit Sass `@use`; never use deprecated `@import`.
- Keep nesting shallow and purposeful. Nest states such as `&:hover` and closely owned descendants,
  not full DOM trees.
- Do not create `.css` or indented `.sass` files under `src`.
- Do not use global component classes or `!important` to bypass style ownership.
- Consume runtime design values with `var(--token-name)` in components. Add shared values to the
  appropriate Sass map in `abstracts/_variables.scss` and confirm `_tokens.scss` emits them.
- Keep `_global.scss` limited to reset and element defaults. Use locally owned class selectors;
  avoid IDs, brittle positional selectors, and styling through deep parent chains.

## React and TypeScript

- Type public props, request/response data, and utility boundaries explicitly.
- Prefer composition and focused components over configuration-heavy mega-components.
- Do not define components inside components.
- Derive values during render; use effects only to synchronize with external systems.
- Abort obsolete requests and avoid sequential awaits for independent work.
- Avoid global state until distant features genuinely share mutable client-owned state.
- Do not duplicate server data into separate stores without a synchronization plan.

## Interface quality

- Use semantic HTML, visible focus, keyboard access, useful labels, and reduced-motion support.
- Handle loading, empty, error, success, disabled, and narrow-screen states where relevant.
- Keep user-facing controls functional; do not ship inert visual placeholders in completed workflows.
- Preserve an accepted design source exactly when one exists. Use tokens and reusable variants.

## API access

- Feature request functions call the shared HTTP boundary; components do not call `fetch` directly.
- Treat response data as external until validated or constrained by an explicit contract.
- Browser environment variables are public; never place secrets in `VITE_*` values.

## Commands

Run from `frontend/`:

```bash
cp .env.example .env
npm ci
npm run test:install
npm run dev
npm run check
npm test
```

`npm run check` covers lint, types, and the production build. `npm test` owns a separate Vite server
on port 4175 and checks quote workflows and controlled API responses in desktop/tablet/mobile
Chromium. Run the repository
smoke command as well when real frontend/backend integration changes. Update Chromium with
`npm run test:install` after upgrading Playwright.
