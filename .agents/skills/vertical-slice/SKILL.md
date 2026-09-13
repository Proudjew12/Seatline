---
name: vertical-slice
description: Implement a complete user-facing Seatline feature across its React frontend, HTTP contract, and FastAPI backend. Use for product behavior spanning one or both application roots; do not use for documentation-only work.
---

# Implement a vertical slice

Deliver one observable Seatline workflow completely, following `README.md` and the applicable
root, frontend, and backend `AGENTS.md` files.

## Before implementation

- Turn the request into acceptance checks, including validation, authorization or ownership, and
  loading, empty, error, success, disabled, and repeated-use states where they apply.
- Update the product scope and acceptance checks in `README.md` when the request changes intent.
- Define the smallest stable HTTP request and response. Keep frontend and backend coupled only by
  HTTP. FastAPI generates the live schema from its routes and Pydantic models in development.

## Ownership

- Organize production code under domain-named frontend features and backend modules.
- Backend flow is `router -> service -> repository/integration`. Add I/O layers only for real I/O.
- Frontend pages compose domain features; feature API calls go through the shared HTTP boundary.
- Keep entry points limited to registration and composition.

## Completion

- Implement backend schemas and rules, register the router, then connect feature API functions,
  hooks, and colocated SCSS Modules through a real page. Complete each required side of the workflow.
- Exercise changed boundaries directly and run a real HTTP/browser check when the workflow spans
  both applications.
- Keep backend schemas and frontend consumers aligned. Add schema snapshots or client generation
  only when needed; use existing generation tooling if the product has adopted it.
- Run focused checks, exercise the workflow, then run `python3 scripts/check.py`.
- Review for dead code, placeholders, secrets, generated artifacts, and cross-application imports.
