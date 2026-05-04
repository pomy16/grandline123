# TCG Monitor Platform

A production-oriented full-stack monitoring platform for e-commerce products focused on Pokemon TCG and One Piece Card Game sealed products.

The current delivery includes **Phase 1 and Phase 2**: project structure, Prisma database model, Docker Compose, backend API skeleton, worker skeleton, mocked scanner, Discord webhook test path, dashboard skeleton, seed data, test setup, and live admin workflows for stores, keyword rules, products, scan history, and mocked scanner runs. Real store scraping adapters are intentionally not implemented yet.

## Safety and Compliance

This project is designed as a monitoring and purchase-assist tool, not an automation tool for checkout.

- No CAPTCHA bypass.
- No queue bypass.
- No login protection bypass.
- No anti-bot evasion.
- No proxy rotation or fingerprint evasion.
- No automatic checkout, order submission, or payment.
- Store polling should use official APIs, public JSON endpoints, RSS feeds, sitemap.xml, or structured data where possible.
- HTML parsing is only for publicly accessible product or listing pages.
- The application supports only manual purchase assist actions such as opening a product URL or a public cart URL.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn-style local UI primitives
- Backend: Node.js, TypeScript, Express
- Worker: BullMQ and Redis
- Database: PostgreSQL
- ORM: Prisma
- Notifications: Discord webhooks
- Deployment: Docker Compose
- Authentication: basic admin login with email and password

## Project Structure

```text
apps/
  api/       Express REST API
  web/       Next.js admin dashboard
  worker/    BullMQ worker and monitor adapters
packages/
  shared/    Shared types and normalization utilities
prisma/
  schema.prisma
  seed.ts
data/sample/
  mock-products.json
docker-compose.yml
.env.example
```

## Phase 1 Features

- Complete Prisma schema for users, stores, products, snapshots, events, keyword rules, Discord webhooks, scan jobs, logs, notification logs, ignored products, and app settings.
- Express API skeleton with endpoints for:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/dashboard`
  - `GET/POST/PATCH/DELETE /api/stores`
  - `POST /api/stores/:id/scan`
  - `GET /api/products`
  - `POST /api/products/:id/ignore`
  - `POST /api/products/:id/unignore`
  - `POST /api/products/:id/test-alert`
  - `GET /api/events`
  - `GET/POST/PATCH/DELETE /api/rules`
  - Discord webhook settings and test endpoints
  - Logs and scan job endpoints
- BullMQ worker with a `MOCK` monitor.
- Dashboard skeleton pages:
  - Dashboard home
  - Products
  - Stores
  - Rules
  - Events
  - Settings
  - Logs
  - Login
- Docker Compose for PostgreSQL, Redis, API, worker, and web.
- Seed data with disabled demo store, keyword rules, placeholder webhook, demo product, and demo event.
- Initial Vitest setup for shared normalization utilities.

## Phase 2 Features

- Admin login UI stores a bearer token in local browser storage.
- Store management UI:
  - create stores
  - edit stores
  - pause and resume stores
  - delete stores
  - configure listing URLs, monitor mode, polling interval, currency, country, language, request headers, selectors, notes, trusted flag, and public cart URL
  - trigger manual mock scans
- Keyword rules UI:
  - create, edit, and delete rules
  - include and exclude keywords
  - game, category, min and max price, priority, webhook target, cooldown, case-insensitive matching, and fuzzy matching flags
- Product database UI:
  - searchable product list
  - filters for store, game, stock status, category, price, and first seen date
  - product image thumbnails
  - current and previous price
  - stock status badges
  - open product button
  - queue test alert button
  - ignore product button
- Live event timeline and logs pages backed by the API.
- Mock scanner now applies active keyword rules to scanned products before persistence.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Important variables:

```bash
DATABASE_URL=postgresql://tcg_monitor:tcg_monitor@localhost:5432/tcg_monitor?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
DISCORD_DEFAULT_WEBHOOK_URL=https://discord.com/api/webhooks/replace/default
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Use real Discord webhook URLs only when you are ready to test delivery.

## Local Setup

Install dependencies:

```bash
npm install
```

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Run the first migration:

```bash
npm run prisma:migrate -- --name init
```

Seed demo data:

```bash
npm run prisma:seed
```

Run API, worker, and frontend:

```bash
npm run dev
```

Open:

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/health](http://localhost:4000/health)

## Docker Compose Setup

For the full stack:

```bash
cp .env.example .env
docker compose up --build
```

Then run migrations in another terminal:

```bash
docker compose exec api npm run prisma:migrate -- --name init
docker compose exec api npm run prisma:seed
```

## Mock Scanner

Phase 1 includes a `MOCK` monitor only. It does not request any external store.

To trigger a scan:

1. Log in through `POST /api/auth/login`.
2. Use the returned bearer token.
3. Resume or create a store with `mode: "MOCK"`.
4. Call:

```bash
curl -X POST http://localhost:4000/api/stores/seed-mock-store/scan \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The worker will create or update demo products, create snapshots, create product events, and write scan logs.

From the dashboard:

1. Sign in at [http://localhost:3000/login](http://localhost:3000/login).
2. Open the Stores page.
3. Create or edit a store with `MOCK` mode.
4. Click `Scan`.
5. Check Products, Events, and Logs.

## Discord Webhook Test

Configure an active webhook in the database or through the Settings API, then call:

```bash
curl -X POST http://localhost:4000/api/settings/webhooks/WEBHOOK_ID/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The Discord embed includes product title, store, price, stock status, category, event type, timestamp, image, and an open product quick action.

## Adding a Store

Stores support:

- name
- base URL
- listing URLs
- optional API endpoint
- monitor mode
- polling interval
- currency
- country and language
- active or inactive status
- optional request headers
- selectors for HTML mode
- notes
- trusted store flag and public cart URL for purchase-assist mode

Real `API`, `HTML`, `SITEMAP`, `RSS`, and `PLAYWRIGHT` adapters are planned for Phase 4.

## Adding Keyword Rules

Rules support include keywords, exclude keywords, game, category, min and max price, priority, webhook target, case-insensitive matching, optional fuzzy matching, and cooldown seconds.

Seeded examples cover Pokemon sealed products and One Piece sealed products.

## Tests

Run all tests:

```bash
npm test
```

Run shared utility tests:

```bash
npm run test -w packages/shared
```

Current Phase 1 tests cover normalization, price parsing, URL normalization, game inference, and identity key generation.

## Deployment Notes

- Use strong `JWT_SECRET` and admin password values.
- Run Prisma migrations before starting production services.
- Keep webhook URLs secret.
- Tune polling intervals per store.
- Keep request timeouts and retry limits conservative.
- Configure log retention according to your storage requirements.
- Do not enable real monitors against stores until rate limits and robots.txt behavior are reviewed.

## Troubleshooting

### Prisma client is missing

Run:

```bash
npm run prisma:generate
```

### Database connection fails

Check:

```bash
docker compose ps
docker compose logs postgres
```

### Worker does not process scans

Check Redis and worker logs:

```bash
docker compose logs redis
docker compose logs worker
```

### Discord test fails

Confirm the webhook URL is valid, active, and not a placeholder. Discord may also reject malformed or deleted webhook URLs.

## Roadmap

Phase 2 implemented real store management flows, keyword rule CRUD UI, product database views, and deeper mocked scanner integration.

Phase 3 will implement Discord webhook routing, event cooldowns, and duplicate alert prevention.

Phase 4 will implement API, HTML, sitemap, RSS, and optional Playwright monitor adapters.

Phase 5 will complete dashboard tables, filters, logs, settings, and manual scan controls.

Phase 6 will add broader tests, seed coverage, error handling, and production hardening.
