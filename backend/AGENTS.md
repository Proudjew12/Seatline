# Seatline backend instructions

These instructions apply inside the standalone `backend/` application and refine the repository-level rules.

## Independence

- This folder must remain installable, runnable, verifiable, and copyable without `frontend/` or root scripts.
- Never import frontend source code or rely on paths outside this folder for runtime behavior.
- Expose capabilities through explicit HTTP contracts.

## Structure

- Keep `src/app/main.py` limited to application construction, middleware, handlers, and top-level router registration.
- Put each business capability in `src/app/modules/<feature>`.
- Use domain-named modules and keep `health` as an operational endpoint.
- Use `router.py` for HTTP concerns, `schemas.py` for Pydantic boundaries, and `service.py` for behavior.
- Add `repository.py` only for real persistence and `integration.py` only for a real external service.
- Put cross-cutting primitives in `core` only when multiple features genuinely need them.
- Group reusable pure validators by purpose under `core/validation`; do not create a generic
  catch-all `utils.py` or mix feature behavior into the shared layer.

## API behavior

- Use explicit response models and HTTP status codes.
- Validate all externally controlled values with meaningful size, range, and format constraints.
- Enforce authentication, authorization, and object ownership server-side.
- Keep public errors stable and safe. Do not expose exceptions, paths, SQL, credentials, or provider payloads.
- Make writes idempotent when retries are expected, or document why they are not.
- Do not run blocking network, filesystem, or database calls directly inside async route paths.

## Python quality

- Type every public function and boundary.
- Prefer immutable data and pure functions for business rules.
- Avoid module-level mutable state except deliberate process-wide infrastructure.
- Use dependency injection for replaceable I/O and deterministic validation.
- Treat `pyproject.toml` as the dependency source.
- After dependency changes, run `python manage.py lock`; never hand-edit lock files.

## Commands

Run from `backend/`:

```bash
python manage.py setup
python manage.py dev
python manage.py check
python manage.py test
python manage.py clean
python manage.py lock
```
