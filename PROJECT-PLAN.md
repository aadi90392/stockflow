# StockFlow implementation plan

Decision date: 2026-11-08. Status: first implementation built; see README for setup, checks and current limits.

## Stack
React 19.3.1, TypeScript 7.0.2, Vite 8.3.6, Tailwind CSS 4.3.5.
Hono 4.13.17 on Cloudflare Workers; Cloudflare D1 (SQLite) with explicit SQL and triggers, Zod 4.6.7.
These are npm latest stable tags checked on the decision date. Verify peer and build compatibility together before locking dependencies; prefer compatible stable versions over beta packages.
Node test runner with SQLite invariant tests and local Worker API integration tests. Browser inspection for UI.

## Isolation
Independent Git repository, dependencies, Cloudflare Worker, D1 database and secrets. Local frontend port 5174. Never reuse SlotForge database or production bindings. Cloudflare account-level quotas are shared.

## Product scope
Organizations, owner/manager/staff roles, locations, products/SKUs, suppliers, purchase orders with partial receipts, dispatch/receive transfers, manual sales and returns, reasoned adjustments, immutable inventory movements, low-stock dashboard and CSV exports.
Quantities are integer units initially; money is integer minor units. Atomic conditional stock deductions prevent negatives. Unique idempotency keys prevent duplicate receiving/sales operations. Record business movements and balance changes atomically. Audit changes and enforce tenancy server-side. No claims of accounting/tax compliance.

## Free hosting approach
Workers Free with static assets and same-origin Hono API. D1 Free for relational data. Bounded compressed product thumbnails in a separate D1 table, fetched only when needed; not intended for large media libraries. No R2 subscription, paid image service, Docker or AWS required for the first release. Use free workers.dev subdomain.
Production email uses separately configured Brevo credentials, within provider quota. Authentication implementation and CPU suitability must be validated before deployment, not assumed from local success.
No guarantee of unlimited usage or perpetual vendor pricing. Keep paid services disabled; monitor shared account quotas.

## Delivery
Implement schema and transaction invariants first, then responsive UI and workflows. Build meaningful concurrency, permission and lifecycle tests. Create independent GitHub repository and configure test-gated deployment when ready. Production provisioning must not touch SlotForge.
