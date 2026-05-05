# TCG Monitor Platform

A production-oriented full-stack monitoring platform for e-commerce products focused on Pokemon TCG and One Piece Card Game sealed products.

The current delivery includes **Phase 1 through Phase 8**: full-stack architecture, admin workflows, Discord notification routing, real public-source monitor adapters, polished dashboard UX, production hardening, CI, tests, improved seed data, store-specific routing, Czech store presets, and deployment documentation.

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

## Phase 3 Features

- Discord routing for product events created by the worker.
- Webhook target selection by:
  - high priority rules
  - explicit keyword rule webhook target
  - product game (`POKEMON`, `ONE_PIECE`, or `BOTH`)
  - default webhook fallback
- Event cooldowns using keyword rule cooldowns or the global `notificationCooldownSeconds` setting.
- Duplicate alert prevention with stable state hashes and notification payload hashes.
- Notification logs for sent, failed, and skipped deliveries.
- Improved Discord delivery error handling with timeout, HTTP status, short response body, duration, and scan log entries.
- Settings UI for creating, editing, deleting, and testing Discord webhooks.
- Logs UI now includes notification delivery history.

## Phase 4 Features

- Real monitor adapters:
  - `API` monitor for public JSON endpoints.
  - `HTML` monitor for publicly accessible listing/product pages and JSON-LD structured data.
  - `SITEMAP` monitor for sitemap.xml and sitemap index files.
  - `RSS` monitor for RSS/Atom feeds.
  - `PLAYWRIGHT` monitor as an optional JavaScript-rendering fallback.
- Per-store monitor mode selection through the Store `mode` field.
- Safe HTTP client with request timeout, retry logic, exponential backoff, configurable user-agent, and basic robots.txt checks.
- Safe parser handling for malformed JSON, XML, RSS, structured data, and selector extraction.
- Scan preview/debug output in Logs before products are persisted.
- No CAPTCHA bypass, queue bypass, anti-bot evasion, proxy rotation, automated checkout, or protection-bypass logic.

## Phase 5 Features

- Production-ready dashboard tables with filtering, sorting, pagination, loading states, error states, and empty states.
- Improved Stores, Products, Logs, Settings, Events, and Dashboard pages.
- Better manual scan controls, scan result viewer, clearer scan history, and clearer notification delivery history.
- Safer admin forms with validation and destructive-action confirmations.
- Responsive navigation and clearer store/product/event status badges.
- Store error clearing from the UI.

## Phase 6 Features

- Strict environment validation for API and worker startup.
- Structured JSON logging with redaction for tokens, passwords, secrets, and webhook values.
- API security headers and clearer health endpoints:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /health/worker`
- Worker graceful shutdown, queue concurrency/rate-limit configuration, retry/backoff configuration, and retention cleanup.
- Scan failure hardening with repeated-failure tracking and auto-pause after a configurable threshold.
- Expanded unit tests for shared utilities, keyword matching, parsing, normalization, duplicate detection, event generation, Discord payload formatting, monitor safety, API health routes, auth helpers, and web utility smoke coverage.
- Idempotent seed data with Pokemon and One Piece demo scenarios, scan jobs, logs, notification logs, and placeholder webhook routes.
- Production-oriented Dockerfiles and GitHub Actions CI.

## Phase 7 Features

- Store-specific Discord webhook routing for personal store channels.
- Additional webhook targets for `TEST`, `RESTOCK`, `PRICE_DROP`, and `PREORDER`.
- Routing priority now checks test, error, high-priority, store-specific, event-type, rule-specific, game-specific, then default webhooks.
- Stores UI supports selecting a store-specific Discord webhook.
- Purchase-assist-only UI preparation keeps purchase actions manual and limited to opening public product or cart links.

## Phase 8 Features

- Disabled-by-default Czech store presets for Alza, Dráčik, Smarty, Pompo, Cardstore, Luxor, Tolarie, and Knihy Dobrovský.
- Store presets use public category/listing pages and conservative polling intervals.
- Store-specific webhook assignment is resolved by webhook record name, not by hardcoded URL.
- Seed notes document source URLs, recommended intervals, limitations, and missing webhook assignments.
- Tests verify preset uniqueness, safe polling intervals, no Discord webhook URLs in presets, and name-based webhook assignment.

## Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Important variables:

| Variable | Required | Used by | Description |
| --- | --- | --- | --- |
| `NODE_ENV` | No | all | `development`, `test`, or `production`. Production enables stricter validation. |
| `API_PORT` | No | API | API listen port. Defaults to `4000`. |
| `WEB_PORT` | No | web | Next.js listen port. Defaults to `3000`. |
| `DATABASE_URL` | Yes | API, worker, Prisma | PostgreSQL connection string. |
| `REDIS_URL` | Yes in production | API, worker | Redis connection string for BullMQ. Defaults to local Redis in development. |
| `JWT_SECRET` | Yes | API | Session signing secret. Must be long and changed from the default in production. |
| `SESSION_TTL_SECONDS` | No | API | Bearer token lifetime. Defaults to one day. |
| `ADMIN_EMAIL` | Yes in production | seed | Initial admin email. Demo default is `admin@example.com`. |
| `ADMIN_PASSWORD` | Yes in production | seed | Initial admin password. Demo default is `change-me`. |
| `DISCORD_DEFAULT_WEBHOOK_URL` | No | seed/settings | Optional default Discord webhook placeholder. Keep inactive until ready. |
| `DISCORD_POKEMON_WEBHOOK_URL` | No | seed/settings | Optional Pokemon route placeholder. |
| `DISCORD_ONE_PIECE_WEBHOOK_URL` | No | seed/settings | Optional One Piece route placeholder. |
| `DISCORD_HIGH_PRIORITY_WEBHOOK_URL` | No | seed/settings | Optional high-priority route placeholder. |
| `DISCORD_ERROR_WEBHOOK_URL` | No | seed/settings | Optional error route placeholder. |
| `DISCORD_TEST_WEBHOOK_URL` | No | seed/settings | Optional test alert route placeholder. |
| `DISCORD_RESTOCK_WEBHOOK_URL` | No | seed/settings | Optional restock event route placeholder. |
| `DISCORD_PRICE_DROP_WEBHOOK_URL` | No | seed/settings | Optional price-drop event route placeholder. |
| `DISCORD_PREORDER_WEBHOOK_URL` | No | seed/settings | Optional preorder event route placeholder. |
| `NEXT_PUBLIC_API_BASE_URL` | Yes for web | web | Browser-visible API base URL. |
| `DEFAULT_POLLING_INTERVAL_SECONDS` | No | API, worker, seed | Safer default polling interval. Minimum is 60 seconds. |
| `NOTIFICATION_COOLDOWN_SECONDS` | No | API, worker, seed | Global notification cooldown default. |
| `REQUEST_TIMEOUT_MS` | No | worker | Public monitor request timeout. |
| `MAX_RETRIES` | No | worker | Retry count for retryable public monitor failures. |
| `RETRY_BASE_DELAY_MS` | No | worker | Exponential backoff base delay. |
| `QUEUE_JOB_ATTEMPTS` | No | API | BullMQ attempts for queued jobs. |
| `QUEUE_BACKOFF_MS` | No | API | BullMQ retry backoff delay. |
| `QUEUE_CONCURRENCY` | No | worker | Worker scan concurrency. |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | No | worker | Queue limiter cap. |
| `REPEATED_FAILURE_PAUSE_THRESHOLD` | No | worker | Auto-pause store after repeated scan failures. |
| `LOG_RETENTION_DAYS` | No | worker, seed | Retention window for scan logs, notification logs, and finished scan jobs. |
| `CLEANUP_INTERVAL_MS` | No | worker | Scheduled cleanup interval. |
| `MONITOR_USER_AGENT` | Yes in production | worker | Clear purchase-assist monitoring user agent. |
| `RESPECT_ROBOTS_TXT` | No | worker | Keep `true` for safe default behavior. |
| `HTML_MONITOR_MAX_PRODUCT_PAGES` | No | worker | Maximum HTML product pages per listing scan. |
| `SITEMAP_MONITOR_MAX_SITEMAPS` | No | worker | Maximum sitemap files to inspect. |
| `SITEMAP_MONITOR_MAX_PRODUCT_PAGES` | No | worker | Maximum sitemap product pages to inspect. |
| `DISCORD_TIMEOUT_MS` | No | worker/API settings test | Discord delivery timeout. |

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

Demo credentials after seeding with the default `.env`:

- Email: `admin@example.com`
- Password: `change-me`

Change these values before any production use.

Run API, worker, and frontend:

```bash
npm run dev
```

In local development the API and worker load the repository root `.env` automatically, so you do not need to manually `source .env`.

Open:

- Web: [http://localhost:3000](http://localhost:3000)
- API health: [http://localhost:4000/health](http://localhost:4000/health)

## Docker Compose Setup

For local full-stack development:

```bash
cp .env.example .env
docker compose up --build
```

Then run migrations in another terminal:

```bash
docker compose exec api npm run prisma:migrate -- --name init
docker compose exec api npm run prisma:seed
```

The compose file mounts the source tree and overrides service commands to run development servers. The service Dockerfiles build production artifacts and run:

- API: `npm run start -w apps/api`
- Worker: `npm run start -w apps/worker`
- Web: `npm run start -w apps/web`

For production, use strong secrets, external PostgreSQL/Redis or managed equivalents, run migrations before starting workers, and keep the web `NEXT_PUBLIC_API_BASE_URL` pointed at the public API URL.

## Mock Scanner

The `MOCK` monitor does not request any external store.

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

Configure an active webhook in the database, through the Settings API, or through the Settings UI.

From the dashboard:

1. Sign in at [http://localhost:3000/login](http://localhost:3000/login).
2. Open Settings.
3. Create a webhook with target `DEFAULT`, `POKEMON`, `ONE_PIECE`, `HIGH_PRIORITY`, `ERROR_LOG`, `TEST`, `RESTOCK`, `PRICE_DROP`, or `PREORDER`.
4. Click `Test`.
5. Check Logs -> Notification delivery.

From the API:

```bash
curl -X POST http://localhost:4000/api/settings/webhooks/WEBHOOK_ID/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The Discord embed includes product title, store, price, stock status, category, event type, timestamp, image, and an open product quick action.

## Discord Routing

When the worker creates a product event, it resolves a webhook in this order:

1. `TEST` when sending product test notifications.
2. `ERROR_LOG` for system error delivery paths.
3. `HIGH_PRIORITY`, when a matched rule has `HIGH` or `CRITICAL` priority.
4. The store-specific webhook selected on the Store, when active.
5. Event-type targets: `RESTOCK`, `PRICE_DROP`, or `PREORDER`.
6. The matched keyword rule's explicit webhook target, when it is not `DEFAULT`.
7. `POKEMON` or `ONE_PIECE`, based on the product game.
8. `DEFAULT`.

If no active webhook is found, the delivery is recorded as `SKIPPED`.

Duplicate prevention uses:

- `Product.lastNotifiedHash`
- stable notification payload hashes
- per-product and per-event-type cooldown checks

Manual product test alerts can still be sent from the Products page and are logged separately.

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
- optional store-specific Discord webhook
- trusted store flag and public cart URL for purchase-assist mode

Real `API`, `HTML`, `SITEMAP`, `RSS`, and optional `PLAYWRIGHT` adapters are available.

Store-specific Discord webhooks are useful for personal channels such as `cz-alza`, `cz-dracik`, `cz-smarty`, `cz-pompo`, `cz-cardstore`, `cz-luxor`, `cz-tolarie`, and `cz-knihy-dobrovsky`. Create or activate the webhook in Settings, then select it on the Store form.

## Czech Store Presets

Run `npm run prisma:seed` to create or update the Czech presets. The presets use fixed internal IDs, so running the seed repeatedly updates the same rows instead of duplicating stores. Newly created real-store presets are paused by default; if you enable one and run the seed again, the seed keeps your active/paused choice.

The seed links each preset to a store-specific Discord webhook only when a webhook record with the matching name already exists. It never stores real Discord webhook URLs in preset definitions. Add real webhook URLs in Settings, keep them masked in the UI, then assign or verify the store-specific webhook on the Stores page.

| Store | Webhook name | Source URL(s) | Mode | Interval | Default |
| --- | --- | --- | --- | --- | --- |
| Alza | `cz-alza` | `https://www.alza.cz/hracky/levne-pokemon-karty/18879069.htm` | `HTML` | 300s | paused |
| Dráčik | `cz-dracik` | `https://www.dracik.cz/pokemon-karticky/` | `HTML` | 180s | paused |
| Smarty | `cz-smarty` | `https://www.smarty.cz/pokemon-tcg-4c14578`, `https://www.smarty.cz/one-piece-tcg-4c14584` | `HTML` | 180s | paused |
| Pompo | `cz-pompo` | `https://pompo.cz/pokemon/` | `HTML` | 300s | paused |
| Cardstore | `cz-cardstore` | `https://www.cardstore.cz/pokemon-produkty/`, `https://www.cardstore.cz/one-piece-tcg/` | `HTML` | 180s | paused |
| Luxor | `cz-luxor` | `https://www.luxor.cz/nakladatel/4415` | `HTML` | 180s | paused |
| Tolarie | `cz-tolarie` | `https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/`, `https://www.tolarie.cz/koupit_produkty/katalog/70-one-piece/` | `HTML` | 180s | paused |
| Knihy Dobrovský | `cz-knihy-dobrovsky` | `https://www.knihydobrovsky.cz/pokemon-tcg` | `HTML` | 300s | paused |

Recommended one-by-one test flow:

1. Open Settings and create or update webhook records named `cz-alza`, `cz-dracik`, `cz-smarty`, `cz-pompo`, `cz-cardstore`, `cz-luxor`, `cz-tolarie`, and `cz-knihy-dobrovsky`.
2. Paste real webhook URLs only in Settings, not in code, seed files, README, store notes, or logs.
3. Open Stores and verify each preset has the expected store-specific webhook selected.
4. Enable one store at a time.
5. Run a manual scan.
6. Review Logs, Products, and Events before enabling the next store.

Some stores may return HTTP 403, block automated requests, or expose markup that changes over time. In that case the app should fail safely with zero products, zero events, skipped alerts, scan logs, and existing repeated-failure/backoff handling. Do not work around this with CAPTCHA solving, queue bypassing, proxy rotation, evasion logic, login automation, or private endpoints.

Do not use 1-second polling or aggressive retry behavior. Keep normal real-store intervals in the 180-300 second range unless you have a specific safe source and a reason to change it. Reserve 60-second polling for future high-priority watchlist functionality, not as the default for all stores.

## Configuring a Real Store Safely

Use the least invasive monitor mode that works:

1. Prefer `API` when the store publishes a public JSON endpoint.
2. Use `RSS` when the store publishes a product feed.
3. Use `SITEMAP` when products are discoverable through sitemap.xml.
4. Use `HTML` only for publicly accessible listing or product pages.
5. Use `PLAYWRIGHT` only when a public page requires JavaScript rendering and no simpler public source exists.

Recommended setup:

- Keep polling intervals conservative, for example 300 seconds or more.
- Keep `RESPECT_ROBOTS_TXT=true`.
- Do not add cookies, session tokens, checkout URLs, login-only endpoints, or private APIs.
- Do not monitor pages protected by CAPTCHA, queues, login walls, or anti-bot challenges.
- Use request headers only for normal public access metadata, such as a clear user-agent:

```json
{
  "user-agent": "TCGMonitor/0.1 (+https://github.com/pomy16/grandline123; contact: you@example.com)",
  "accept": "application/json,text/html,application/xml,text/xml;q=0.9,*/*;q=0.8"
}
```

For `HTML` mode, configure selectors only for public page content:

- product URL selector
- product title selector
- price selector
- image selector
- stock status selector
- preorder status selector

The HTML monitor first attempts JSON-LD structured data, then configured selectors, and writes a scan preview to Logs.

### API Monitor

Configure:

- `mode`: `API`
- `apiEndpoint`: public JSON endpoint
- optional listing URLs for additional public JSON endpoints

The API parser accepts arrays or common wrappers such as `products`, `items`, `data`, `results`, and `nodes`.

### Sitemap Monitor

Configure:

- `mode`: `SITEMAP`
- listing URLs with sitemap.xml URLs, or leave listing URLs empty to try `/sitemap.xml`

The sitemap monitor extracts likely product URLs and parses product pages through the HTML monitor.

### RSS Monitor

Configure:

- `mode`: `RSS`
- listing URLs with public RSS/Atom feed URLs

The RSS monitor reads item/entry title, link, description, price, image, availability, GTIN, and category fields when present.

### Playwright Monitor

Configure:

- `mode`: `PLAYWRIGHT`
- listing URLs for public pages that require JavaScript rendering

Install Playwright before using this mode:

```bash
npm install -w apps/worker playwright
npx playwright install chromium
```

Do not use Playwright to bypass CAPTCHA, queues, bot checks, login walls, checkout restrictions, or any store protection. It is only for rendering public pages when simpler public sources are unavailable.

## Adding Keyword Rules

Rules support include keywords, exclude keywords, game, category, min and max price, priority, webhook target, case-insensitive matching, optional fuzzy matching, and cooldown seconds.

Seeded examples cover Pokemon sealed products and One Piece sealed products.

## Tests

Run all tests:

```bash
npm test
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run production builds:

```bash
npm run build
```

Run shared utility tests:

```bash
npm run test -w packages/shared
```

Current tests cover:

- shared normalization utilities
- Czech store preset safety and routing metadata
- keyword rule matching
- price parsing
- product parsing and normalization
- duplicate product detection
- event generation and state hashing
- Discord payload formatting
- real monitor safety behavior
- API health route behavior
- auth helper behavior
- web formatting smoke coverage

## Deployment Notes

- Use strong `JWT_SECRET` and admin password values.
- Run Prisma migrations before starting production services.
- Keep webhook URLs secret.
- Tune polling intervals per store.
- Keep request timeouts and retry limits conservative.
- Keep `RESPECT_ROBOTS_TXT=true`.
- Keep webhook placeholders inactive until real Discord URLs are configured.
- Monitor `GET /health/ready` and `GET /health/worker`.
- Review Logs for repeated scan failures. Stores auto-pause after `REPEATED_FAILURE_PAUSE_THRESHOLD`.
- Run CI or the local verification commands before deploying:

```bash
npm install
npm run prisma:generate
npm run typecheck
npm test
npm run build
```

## Discord Webhook Safety

- Add real webhook URLs only in Settings when you are ready to test delivery.
- Webhook URLs are masked in the Settings list and redacted by structured logs.
- Use separate targets for `DEFAULT`, `POKEMON`, `ONE_PIECE`, `HIGH_PRIORITY`, `ERROR_LOG`, `TEST`, `RESTOCK`, `PRICE_DROP`, and `PREORDER` when useful.
- Use store-specific webhook selection for personal store channels instead of creating public/community routing features.
- Test delivery from Settings before activating broad alert rules.
- Do not paste webhook URLs into scan logs, store notes, or issue reports.

## Troubleshooting

- **API fails on startup**: check `DATABASE_URL`, `REDIS_URL`, and `JWT_SECRET`. Production mode requires non-default secrets.
- **Login fails**: run `npm run prisma:seed`, then use the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- **Dashboard shows API errors**: verify `NEXT_PUBLIC_API_BASE_URL` and `GET /health/ready`.
- **Worker is not scanning**: verify Redis is reachable and check `GET /health/worker`.
- **Store auto-paused**: inspect Logs, fix the store configuration or public source, then clear the store error and resume it.
- **Discord alerts are skipped**: configure and activate a matching webhook target, then inspect Logs -> Notification delivery.
- **HTML monitor finds no products**: prefer JSON-LD/public API/RSS/sitemap when available; otherwise review selectors against public page markup.
- **Tests fail after dependency install on macOS**: remove `node_modules` and reinstall. This can happen with native optional Rollup packages.

## Known Limitations

- No automatic purchasing, checkout automation, queue bypassing, CAPTCHA solving, proxy rotation, or evasion logic.
- Playwright is optional and only for rendering public pages that require JavaScript.
- HTML parsing is intentionally conservative and may need selectors per store.
- Notification delivery depends on Discord availability and webhook configuration.
- Scheduling is queue-based; production deployments should monitor Redis and worker health.
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

Phase 3 implemented Discord webhook routing, event cooldowns, duplicate alert prevention, notification logs, improved delivery error handling, and webhook testing from the UI.

Phase 4 implemented API, HTML, sitemap, RSS, and optional Playwright monitor adapters.

Phase 5 completed dashboard tables, filters, logs, settings, and manual scan controls.

Phase 6 added broader tests, seed coverage, error handling, and production hardening.

Phase 7 added store-specific Discord routing.

Phase 8 added safe Czech store presets for personal monitoring.
