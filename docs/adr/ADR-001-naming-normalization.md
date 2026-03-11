# ADR-001: Naming Normalization Across Layers

- Date: 2026-03-11
- Status: Accepted

## Context

The codebase uses both kebab-case module IDs and snake_case permission/event namespaces.
Without explicit rules, contributors and AI tools produce inconsistent keys.

## Decision

- Use kebab-case for runtime/frontend module IDs.
- Use snake_case for backend permission/event namespaces and API module folder names.
- Enforce naming with `npm run check:naming`.

## Consequences

- Reduces contract drift.
- Makes cross-layer mapping explicit and machine-checkable.
