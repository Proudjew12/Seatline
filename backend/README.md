# Seatline backend

The Seatline API uses FastAPI, a Python `src` layout, and domain feature modules.

This folder is intentionally independent from `frontend/`. It can be copied into its own repository
and run without the full-stack root tooling.

Application code lives in `src/`, behavior tests in `tests/`, and generated dependency locks in
`requirements/`. `pyproject.toml` keeps dependency declarations and Python tool configuration together.

## Setup

```bash
python manage.py setup
```

## Run

```bash
python manage.py dev
```

The API is available at `http://127.0.0.1:8000`, with interactive documentation at
`http://127.0.0.1:8000/docs`. FastAPI generates the live schema at
`http://127.0.0.1:8000/openapi.json` from the routes and Pydantic models; there is no committed schema
snapshot to maintain by default.

`APP_HOST` and `APP_PORT` in `.env` control the development bind address. To read the validated
address without starting the server, run `python manage.py address`; it prints one JSON object for
launchers and other tooling. Invalid environment names, log levels, ports, metadata, hosts, or CORS
origins stop startup with a clear configuration error.

Production mode disables `/docs`, `/redoc`, and `/openapi.json`. `APP_CORS_ORIGINS` must be set
explicitly in production; use an empty value when cross-origin browser access should be disabled.
Configured origins must be absolute HTTP(S) origins without credentials, paths, queries, or
fragments.

GitHub Pages hosts only the frontend. Deploy this API on a separate HTTPS service and set
`APP_CORS_ORIGINS` to the Pages origin, such as `https://OWNER.github.io` (never include the
repository path).

## Quality gate

```bash
python manage.py check
```

The gate runs dependency integrity, Ruff lint/format validation, strict mypy, and pytest. Run
`python manage.py test` for the route, request-ID, error handling, CORS, and settings tests alone.
Tests use pytest and HTTPX2 through FastAPI's test client. Unexpected failures return a generic 500
with CORS and request-ID headers; server logs retain request IDs and traceback locations without raw
exception values or local variables.

Other standalone commands:

```bash
python manage.py address
python manage.py clean
python manage.py lock
```

Add a feature under `src/app/modules/<feature>` and register its router in
`src/app/api/router.py`. Keep `health` as an operational endpoint. Reusable cross-cutting validators
belong in purpose-specific Python modules under `src/app/core/validation`.

`requirements/production.lock` contains runtime dependencies. `requirements/development.lock`
contains runtime and quality/test dependencies. Both are universal, hash-locked outputs generated
from `pyproject.toml`; development is constrained to the production versions. After changing
dependencies, use `uv` and run `python manage.py lock`, then `python manage.py setup`. Locking also
updates compatible transitive dependencies. Install production dependencies with
`python -m pip install --require-hashes -r requirements/production.lock` in a deployment environment.
