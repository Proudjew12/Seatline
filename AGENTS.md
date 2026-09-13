# Repository instructions

This repository contains Seatline, with a React frontend and FastAPI backend. All work here
develops this application. Keep it understandable, verifiable, safe, and maintainable.
Read the product scope in `README.md`; confirm undefined product requirements before implementing
business behavior. Keep both applications independently runnable and deployable.

## Before editing

- Read `README.md`, `.github/SECURITY.md`, and the nearest nested `AGENTS.md`.
- Inspect existing implementation, tests, scripts, and current changes. Preserve unrelated work.
- For non-trivial work, state the user-visible result, compact plan, and acceptance checks.

## Layout and ownership

- Keep `frontend/` and `backend/` as top-level application roots; never add an `apps/` wrapper.
- Each application must remain independently installable, runnable, verifiable, and copyable.
- Applications communicate through HTTP, never source imports. Root scripts are development
  conveniences and must not become runtime dependencies.
- Frontend dependency direction: `app/pages -> features -> components/shared`.
- Backend dependency direction: `router -> service -> repository/integration`.
- Keep entry points and routers thin; validate external values at typed boundaries.
- Use domain-named frontend features and backend modules. Keep `health` as an operational check
  unless explicitly removed.
- Add repositories, integrations, databases, libraries, and abstractions only when needed.
- Prefer direct imports and focused modules. Hand-written source files over 400 lines require an
  explicit justification or refactor.

## Implementation

- Type frontend public boundaries with TypeScript and backend HTTP boundaries with Pydantic.
- Use colocated SCSS Modules and follow `frontend/AGENTS.md` for the complete styling rules.
- Feature request functions use shared HTTP transport; components do not scatter raw `fetch` calls.
- Derive React state when possible, abort obsolete requests, and start independent work in parallel.
- Enforce authorization and ownership server-side. Keep public errors stable and safe.
- Keep credentials and private data out of source, browser variables, and logs.
- Do not hand-edit dependency locks. After backend dependency changes, run
  `python3 backend/manage.py lock`.
- Keep product scope, commands, and important decisions in `README.md`. Add separate documentation
  only when its size or purpose warrants it.
- FastAPI generates `/openapi.json` in development. Update schemas and consumers together when APIs
  change; add a committed schema snapshot or generated client only when needed.

## Verification and safety

Run focused checks, exercise affected workflows, then run the full gate:

```bash
python3 scripts/check.py
```

Use `npm run smoke` for combined startup, HTTP integration, and shutdown changes. For UI changes,
check narrow and desktop layouts, keyboard access, and relevant loading, empty, error, success,
disabled, and retry states. Add regression tests for meaningful behavior changes.

Do not weaken types, checks, or security controls to get a passing result. Do not delete user data,
rewrite unrelated files, or perform destructive Git/deployment operations without authorization.
Keep dependency folders, caches, builds, logs, and real `.env` files out of source control. Review the
final diff for unrelated changes and stale guidance.

Report what changed, exact commands/workflows run, their results, and genuine remaining limitations.
Never claim a check passed unless it was run and inspected.
