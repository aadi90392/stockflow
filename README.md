# StockFlow

Inventory management for small teams with multiple stores or warehouses. Track what is on hand, receive supplier deliveries, record sales and returns, and follow transfers from dispatch to receipt.

## Implemented

- Email sign-in links: single use, 15-minute expiry, hashed tokens and HttpOnly session cookies.
- Separate organizations with owner, manager and staff permissions; private invitation codes and membership removal.
- Products with unique SKUs, compressed private photos, unit cost and reorder thresholds.
- Locations with Google Maps address links and supplier contact links; single-product purchase orders with partial receiving and delivery progress.
- Searchable product/location choices, category suggestions with custom values, prerequisite guidance and available-stock hints.
- Purchase/transfer search and status filters; server-side ledger filters by product, location and movement type.
- Sales, bounded returns, reasoned stock adjustments and dispatch/receive transfers.
- Immutable stock ledger, pagination, current-page CSV export and low-stock overview.
- SQLite triggers atomically update balances and ledger entries; negative stock and over-receiving are rejected.

## Stack

React 19, TypeScript 7, Vite 8, Tailwind CSS 4, Hono, Zod, Cloudflare Workers and D1 (SQLite). Explicit SQL and database triggers keep inventory invariants in the database. No Docker, AWS or paid image storage dependency.

## Run locally

Node.js 24 or newer is required for the database tests.

```powershell
npm.cmd ci
Copy-Item .dev.vars.example .dev.vars
npm.cmd run db:local
npm.cmd run build
npm.cmd run dev:api
```

In another terminal:

```powershell
npm.cmd run dev
```

Open http://127.0.0.1:5174. Local email mode stores links in the **local** database instead of sending mail. After requesting a link, retrieve it locally:

```powershell
npx.cmd wrangler d1 execute DB --local --command "SELECT email,link FROM local_mail ORDER BY created_at DESC LIMIT 1"
```

Treat sign-in links as credentials. Never publish them. Local mail mode is restricted to localhost and is not configured in the production Worker.

## Validate

```powershell
npm.cmd test
npm.cmd run build
# Requires the local API server and migrated local database:
node scripts/integration.mjs
```

The integration script creates isolated test accounts and organizations **locally**. It checks competing sales, staff restrictions, tenant isolation, origin checks and single-use sign-in links. These checks are not production load benchmarks.

## Deploy

The committed Wrangler configuration targets StockFlow's independent database. Forks must create their own D1 database and replace the database ID before deploying. Never point this application at another project's database.

```powershell
npx.cmd wrangler login
npx.cmd wrangler d1 migrations apply DB --remote
npm.cmd run deploy
```

Set production secrets in Cloudflare → Workers & Pages → stockflow → Settings → Variables and Secrets:

| Secret | Value |
| --- | --- |
| `BREVO_API_KEY` | Brevo API key with transactional email sending permission |
| `EMAIL_FROM` | Verified sender email address |
| `APP_ORIGIN` | Exact HTTPS origin of the deployed StockFlow application |

Deploy the secret changes. Test receipt of a sign-in email, sign in and create your own workspace. Do not set `LOCAL_MAIL` in production. GitHub Actions runs tests and builds; GitHub push alone does **not** deploy this Worker.

## Scope and limits

This first release uses integer quantities and INR unit costs. Stock valuation is a current-cost estimate, not FIFO, tax accounting, invoicing or a payment system. Orders contain one product. Purchases and transfers display the latest 200 records; ledger export includes the current page. Dashboard refreshes every 30 seconds. Product photos are resized JPEG thumbnails capped at 96 KiB each and stored in D1, not a bulk media library.

Production email delivery needs the secrets above and a working provider account. Free services have quotas and can change their plans; this project does not promise unlimited or permanently free usage. Workers/D1 quotas are shared with other applications in the same Cloudflare account.

## Image credit

Landing warehouse image: [Unsplash image source](https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d). The reference supplied by the project owner guided the green, cream and yellow visual direction; page content describes inventory management.
