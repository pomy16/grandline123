# TCG Monitor Platform

A production-oriented full-stack monitoring platform for e-commerce products focused on Pokemon TCG and One Piece Card Game sealed products.

The current delivery includes **Phase 1 through Phase 11**: full-stack architecture, admin workflows, Discord notification routing, real public-source monitor adapters, polished dashboard UX, production hardening, CI, tests, improved seed data, store-specific routing, Czech store presets, safer parser behavior, automated public-source discovery, and deployment documentation.

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
- Cart, basket, add-to-cart, checkout, order, and payment URLs are never monitored or requested automatically.

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
- Routing is store-first for product events: test and error routes stay isolated, store-specific webhooks are primary, and high-priority copies are optional.
- Stores UI supports selecting a store-specific Discord webhook.
- Purchase-assist-only UI preparation keeps purchase actions manual and limited to opening public product or cart links.

## Phase 8 Features

- Disabled-by-default Czech store presets for Alza, Dráčik, Smarty, Pompo, Cardstore, Luxor, Tolarie, Knihy Dobrovský, Veselý Drak, TCG Karty, Gengar.cz, Hra na netu, Najáda, Professor Onyx, and Kuma.
- Store presets use public category/listing pages and conservative polling intervals.
- Store-specific webhook assignment is resolved by webhook record name, not by hardcoded URL.
- Seed notes document source URLs, recommended intervals, limitations, and missing webhook assignments.
- Tests verify preset uniqueness, safe polling intervals, no Discord webhook URLs in presets, and name-based webhook assignment.

## Phase 9 Features

- HTML parser ignores cart, basket, add-to-cart, checkout, order, and payment URLs as monitor/product URLs.
- Product-level `publicCartUrl` is available only as a manual purchase-assist shortcut.
- Generic homepage/category entries are skipped instead of being persisted as fake products.
- Discord alerts and Products UI show optional cart links only when `publicCartUrl` exists.

## Phase 10 Features

- Reviewed Czech store source URLs after local testing.
- Pompo now uses a narrower public `pokemon-tcg` category candidate instead of the bad `/pokemon/` URL.
- Luxor now uses a public Pokemon Day page candidate instead of the publisher page that extracted 0 products.
- Added disabled-by-default presets for Veselý Drak, TCG Karty, Gengar.cz, and Hra na netu.
- Preset tests now cover unique slugs, safe polling intervals, safe URL paths, paused defaults, and webhook-name routing.

## Phase 11 Features

- Source candidates are persisted per store and can be inspected from the Stores dashboard.
- A manual Discovery scan queues a worker job that checks public listing URLs, sitemap.xml, sitemap indexes, RSS/Atom candidates, JSON-LD, OpenGraph URLs, and keyword-matching category links.
- Working candidates can be promoted to the store primary source from the UI.
- The Playwright monitor now uses a standard browser context with configurable viewport, locale, timezone, cookies, network-idle waits, and optional selector readiness checks.
- Rendered DOM extraction now supports product-card style category pages in addition to JSON-LD and configured selectors.
- Product persistence now requires a real product URL and strong product evidence such as price, image, SKU/EAN, product ID, JSON-LD Product type, or a clear product card.
- Category/listing/search/publisher pages remain valid source candidates, but are rejected as Product records.
- Homepage, article, guide, blog, privacy/cookie, contact/about, cart, checkout, and other informational URLs are not valid scan source candidates. Existing stale candidates with those URLs are marked `Needs attention` on the next Discovery run.
- Product-card titles prefer real image/title metadata over badges, stock labels, and load-more controls.
- Seeded high-priority rules and built-in matching reject common accessory products such as albums, binders, card sleeves, deck boxes, deck protectors, folios, top loaders, and playmats.
- Scanner persistence is filtered to relevant sealed TCG targets, so articles, external profiles, generic labels, accessories, toys, playmats, albums, sleeves, deck boxes, and similar non-target products do not create Product records, Events, or Discord alerts in future scans.
- Existing product prices/images/game/category are preserved when a rendered card temporarily omits them, preventing noisy `Unknown` price updates.
- `PRODUCT_UPDATED` Discord notifications are skipped by default so scans do not spam Discord with non-actionable title/image cleanup changes.
- Dashboard, Products, Events, Logs, and notification history can flag historical records as `Would skip now` when the current sealed TCG filter would block them.
- Products has a manual bulk-ignore action for the visible historical false positives that would be skipped now. It requires confirmation, does not delete data, and can be restored product by product.
- Store status is clearer: `Active`, `Needs attention`, `Empty`, `Auto-paused`, and `Paused`.
- Czech dynamic/error-prone presets now default to `PLAYWRIGHT` mode while staying paused until tested one by one.
- Discovery and Playwright rendering still respect robots.txt and normal HTTP status handling; blocked sources fail safely instead of being bypassed.
- Discord delivery now throttles sends per webhook route and retries HTTP 429 responses using Discord retry hints.

## Imported Reference Bot Ideas

A second personal bot/reference dashboard was reviewed for safe ideas. The useful parts imported into this project are UI and diagnostics only:

- clearer store/source health summaries
- source candidate counts split into raw extracted, relevant validated, and skipped entries
- stronger visual hierarchy for `Discover`, `Promote`, `Scan`, `Resume`, and `Pause` workflows
- visible store-first Discord routing status
- clearer Logs guidance for scan diagnostics and Discord delivery history
- dashboard guardrails for sealed TCG relevance, source/product separation, and safe manual purchase-assist behavior

The reference bot's scrapers, scheduler, SQLite schema, direct Discord routing map, and any fetching behavior were not copied. This project keeps the existing Prisma/API/worker architecture, safe monitor adapters, strict webhook masking, store-first routing, sealed TCG relevance filtering, and no-checkout/no-purchase automation policy.

## Source Candidate Workflow

`SourceCandidate`, `Product`, and `publicCartUrl` are intentionally separate:

- `SourceCandidate` can be a category, listing, search, publisher, sitemap, RSS, API, or rendered public page used to discover products.
- `Product` must be a validated real product detail/card with a meaningful title, product-specific URL, and strong product evidence.
- `publicCartUrl` is only an optional manual purchase-assist shortcut. It is never scanned automatically and never replaces the product URL.

The Stores page shows each candidate's:

- status (`Target found`, `Needs attention`, `Empty`, or pending)
- recommendation (`Recommended`, `Testable`, `Noisy`, `Needs attention`, or `Unsafe`)
- source score used only for admin diagnostics
- raw extracted candidate count
- relevant validated product count
- skipped non-product/non-target count
- reason or blocker
- whether it is the current primary source

Discovery can keep category/listing URLs as candidates, but those URLs are rejected as Product records unless a real product card/detail is validated. Product detail URLs themselves are not promoted as scan sources; they belong in Product records, while `SourceCandidate` remains a reusable listing/feed/category source. A candidate is considered a target only when relevant sealed TCG products pass validation.

Product URLs are canonicalized without hash fragments because fragments are usually page-local UI state. SourceCandidate URLs are normalized separately and preserve query parameters plus hash fragments, so public filtered category URLs can remain scan sources when the filter is part of the source URL.

Rendered pages with JSON-LD `ItemList` data are parsed by flattening nested `itemListElement -> item -> Product` entries before falling back to product-card anchors. This is important for stores such as Najáda where JSON-LD exposes product URL, price, image, SKU, and `schema.org/InStock` availability more reliably than the visible card anchor alone.

Multiple useful source candidates per store are expected, for example separate booster, publisher, and sorted listing pages. The Stores UI supports adding validated candidates as extra scan sources when they use the same monitor mode as the store. The first URL remains the primary source for display and defaults; all URLs in `Store.listingUrls` are scanned by the existing monitor adapters and products are deduplicated by canonical URL before persistence. If a candidate uses a different monitor mode, promote it as primary to switch the store mode instead of mixing modes in one scan.

The Stores detail view also includes a `Promote best safe source` action. It is explicit admin-only behavior: the app calculates the best safe validated candidate from relevant product count, skipped noise, URL safety, and monitor-mode fit, then promotes it only after you click and confirm. It does not auto-enable stores, bypass blocked pages, or change fetch behavior.

Store create/update rejects unsafe listing URLs before saving. Cart, add-to-cart, checkout, order, payment, homepage, article, guide, privacy, contact, off-store URLs, and product detail URLs cannot be stored as scan sources from the dashboard or API. This does not remove category/listing URLs from Discovery; it only keeps unsafe or non-monitor URLs out of `Store.listingUrls`.

This is intentionally conservative: there is still one store-level monitor mode, no per-candidate fetching behavior, no bypass logic, and no automatic purchasing. Future improvements can add per-candidate enablement metadata and richer per-source scan health without changing the safety model.

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
| `WEB_PORT` | No | web | Next.js local development listen port. Defaults to `3001` for `npm run dev -w @tcg-monitor/web`. |
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
| `DISCOVERY_MAX_CANDIDATES` | No | worker | Maximum public source candidates to validate in one discovery scan. |
| `PLAYWRIGHT_VIEWPORT_WIDTH` | No | worker | Browser viewport width for standard Playwright rendering. |
| `PLAYWRIGHT_VIEWPORT_HEIGHT` | No | worker | Browser viewport height for standard Playwright rendering. |
| `PLAYWRIGHT_TIMEZONE` | No | worker | Browser timezone for standard Playwright rendering. Defaults to `Europe/Prague`. |
| `DISCORD_TIMEOUT_MS` | No | worker/API settings test | Discord delivery timeout. |
| `DISCORD_SEND_DELAY_MS` | No | worker | Minimum delay between sends to the same Discord webhook route. Defaults to 500ms. |
| `DISCORD_MAX_RETRIES` | No | worker | Maximum Discord delivery retries after rate limits. Defaults to 2. |
| `DISCORD_RATE_LIMIT_BACKOFF_MS` | No | worker | Fallback Discord 429 backoff when no retry hint is provided. Defaults to 2500ms. |
| `DISCORD_MULTI_ROUTE_HIGH_PRIORITY` | No | worker | When `false`, high-priority store events go only to the store-specific webhook. When `true`, they also send a copy to `HIGH_PRIORITY`. Defaults to `false`. |
| `NOTIFY_PRODUCT_UPDATED` | No | worker | Set to `true` only if you want Discord alerts for non-stock/non-price product metadata changes. Defaults to `false`. |

Use real Discord webhook URLs only when you are ready to test delivery.

## Local Setup

Install dependencies:

```bash
nvm use
npm install
```

Local development is tested with Node.js 20 LTS. If `npm install` hangs while reading an existing `node_modules` tree, switch to Node 20 and do a clean dependency reinstall:

```bash
nvm use
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm ci --no-audit --no-fund
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

- Web: [http://localhost:3001](http://localhost:3001)
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

1. Sign in at [http://localhost:3001/login](http://localhost:3001/login).
2. Open the Stores page.
3. Create or edit a store with `MOCK` mode.
4. Click `Scan`.
5. Check Products, Events, and Logs.

## Discord Webhook Test

Configure an active webhook in the database, through the Settings API, or through the Settings UI.

From the dashboard:

1. Sign in at [http://localhost:3001/login](http://localhost:3001/login).
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
3. The store-specific webhook selected on the Store, when active.
4. If there is no active store webhook, fallback routes are checked: `HIGH_PRIORITY` for high/critical events, event-type targets, explicit keyword-rule target, game target, then `DEFAULT`.

By default, `HIGH_PRIORITY` does not replace the store channel. With `DISCORD_MULTI_ROUTE_HIGH_PRIORITY=false`, a high-priority Knihy Dobrovský event goes only to `cz-knihy-dobrovsky` when that store webhook is active. With `DISCORD_MULTI_ROUTE_HIGH_PRIORITY=true`, the same event goes to the store webhook and also sends one extra copy to `HIGH_PRIORITY`.

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
- source candidates discovered from public metadata, feeds, sitemaps, and rendered category pages

Real `API`, `HTML`, `SITEMAP`, `RSS`, and optional `PLAYWRIGHT` adapters are available.

Store-specific Discord webhooks are useful for personal channels such as `cz-alza`, `cz-dracik`, `cz-smarty`, `cz-pompo`, `cz-cardstore`, `cz-luxor`, `cz-tolarie`, `cz-knihy-dobrovsky`, `cz-vesely-drak`, `cz-tcgkarty`, `cz-gengar`, `cz-hranane-tu`, `cz-najada`, `cz-professor-onyx`, and `cz-kuma`. Create or activate the webhook in Settings, then select it on the Store form.

## Czech Store Presets

Run `npm run prisma:seed` to create or update the Czech presets. The presets use fixed internal IDs, so running the seed repeatedly updates the same rows instead of duplicating stores. Newly created real-store presets are paused by default; if you enable one and run the seed again, the seed keeps your active/paused choice.

The seed links each preset to a store-specific Discord webhook only when a webhook record with the matching name already exists. It never stores real Discord webhook URLs in preset definitions. Add real webhook URLs in Settings, keep them masked in the UI, then assign or verify the store-specific webhook on the Stores page.

| Store | Webhook name | Source URL(s) | Mode | Interval | Tested status | Default |
| --- | --- | --- | --- | --- | --- | --- |
| Alza | `cz-alza` | `https://www.alza.cz/hracky/levne-pokemon-karty/18879069.htm` | `PLAYWRIGHT` | 300s | limited / needs attention / paused | paused |
| Dráčik | `cz-dracik` | `https://www.dracik.cz/pokemon-karticky/` | `PLAYWRIGHT` | 180s | 0 products after cart URL safety fix / paused | paused |
| Smarty | `cz-smarty` | `https://www.smarty.cz/pokemon-tcg-4c14578`, `https://www.smarty.cz/one-piece-tcg-4c14584` | `PLAYWRIGHT` | 180s | needs attention / paused | paused |
| Pompo | `cz-pompo` | `https://pompo.cz/pokemon-tcg/` | `PLAYWRIGHT` | 300s | candidate URL / paused | paused |
| Cardstore | `cz-cardstore` | `https://www.cardstore.cz/pokemon-produkty/`, `https://www.cardstore.cz/one-piece-tcg/` | `PLAYWRIGHT` | 180s | fetch failed / paused | paused |
| Luxor | `cz-luxor` | `https://www.luxor.cz/clanek/727/pokemon-day` | `PLAYWRIGHT` | 180s | candidate URL / paused | paused |
| Tolarie | `cz-tolarie` | `https://www.tolarie.cz/koupit_produkty/katalog/48-pokemon-produkty/`, `https://www.tolarie.cz/koupit_produkty/katalog/70-one-piece/` | `PLAYWRIGHT` | 180s | generic page skipped / paused | paused |
| Knihy Dobrovský | `cz-knihy-dobrovsky` | `https://www.knihydobrovsky.cz/pokemon-tcg` | `PLAYWRIGHT` | 300s | working | paused |
| Veselý Drak | `cz-vesely-drak` | `https://www.vesely-drak.cz/produkty/boostery/`, `https://www.vesely-drak.cz/produkty/one-piece-card-game/` | `PLAYWRIGHT` | 180s | candidate / paused | paused |
| TCG Karty | `cz-tcgkarty` | `https://www.tcgkarty.cz/tcg-pokemon`, `https://www.tcgkarty.cz/tcg-one-piece` | `PLAYWRIGHT` | 180s | candidate / paused | paused |
| Gengar.cz | `cz-gengar` | `https://www.gengar.cz/pokemon`, `https://www.gengar.cz/one-piece` | `PLAYWRIGHT` | 180s | direct scan found relevant products; discovery timeout / paused | paused |
| Hra na netu | `cz-hranane-tu` | `https://www.hrananetu.cz/kategorie-pokemon` | `PLAYWRIGHT` | 300s | candidate / paused | paused |
| Najáda | `cz-najada` | `https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true`, `https://www.najada.games/pokemon`, `https://www.najada.games/en/pokemon/boosters`, `https://www.najada.games/en/card-games/one-piece` | `PLAYWRIGHT` | 180s | local preview found relevant products / paused | paused |
| Professor Onyx | `cz-professor-onyx` | `https://www.professoronyx.com/boostery-2/`, `https://www.professoronyx.com/ostatni-karetni-hry/` | `PLAYWRIGHT` | 180s | local preview found relevant products / paused | paused |
| Kuma | `cz-kuma` | `https://www.kuma.cz/pokemon-karty/`, `https://www.kuma.cz/boostery/` | `PLAYWRIGHT` | 300s | HTTP 429 during local preview / paused | paused |

Recommended one-by-one test flow:

1. Open Settings and create or update webhook records named `cz-alza`, `cz-dracik`, `cz-smarty`, `cz-pompo`, `cz-cardstore`, `cz-luxor`, `cz-tolarie`, `cz-knihy-dobrovsky`, `cz-vesely-drak`, `cz-tcgkarty`, `cz-gengar`, `cz-hranane-tu`, `cz-najada`, `cz-professor-onyx`, and `cz-kuma`.
2. Paste real webhook URLs only in Settings, not in code, seed files, README, store notes, or logs.
3. Open Stores and verify each preset has the expected store-specific webhook selected.
4. Run a Discovery scan for one store at a time.
5. Review Source candidates and promote only candidates marked `Target found`.
6. Enable that store and run a manual scan.
7. Review Logs, Products, and Events before testing the next store.

Knihy Dobrovský is currently the only preset marked as working/recommended. Other stores should stay paused until a safe public source is confirmed through a local manual scan.

Reviewed source notes:

- Alza and Smarty still return HTTP 403 and should remain paused.
- Dráčik scans safely but currently finds 0 valid products after cart URL safety filtering.
- Pompo now uses a narrower `pokemon-tcg` candidate URL; keep paused until tested.
- Cardstore still has a fetch-failed status from local testing; keep paused.
- Luxor now uses a Pokemon Day candidate page; keep paused until tested.
- Tolarie should remain paused; old generic homepage/category products should be ignored.
- Gengar.cz direct scan found relevant sealed products in the latest local audit, but broader discovery timed out; keep paused and test the selected category source manually.
- New Veselý Drak, TCG Karty, Gengar.cz, Hra na netu, Najáda, Professor Onyx, and Kuma presets are candidates only and are paused by default.
- Najáda uses public Pokemon and One Piece category pages; local preview found relevant products, while broad category pages can include accessories and merchandise, so sealed TCG filtering must stay enabled.
- Professor Onyx uses public Shoptet categories for Pokemon boosters and broader other card games; local preview found relevant products, while the broader category can include non-target games, so review the first scan output before enabling schedules.
- Kuma uses public Pokemon TCG and booster categories, but local preview returned HTTP 429. Do not bypass it; keep the preset paused and retry later through the normal safe scanner.

Some stores may return HTTP 403, block automated requests, expose robots.txt restrictions, return 404, or expose markup that changes over time. In that case the app should fail safely with zero products, zero events, skipped alerts, scan logs, source candidates marked `Needs attention`, and existing repeated-failure/backoff handling. Do not work around this with CAPTCHA solving, queue bypassing, proxy rotation, evasion logic, login automation, or private endpoints.

Purchase-assist link behavior:

- `SourceCandidate` URLs are monitor sources. They may be category, listing, search, publisher, sitemap, RSS, or API URLs such as `/pokemon-tcg`, `/booster`, or `/publisher/detail/...`. Product detail URLs such as Najáda `/produkt/...`, Knihy `/hra/...`, Alza `...-d123.htm`, or Smarty `...-4p123` are not safe scan sources.
- Product URLs are real product detail URLs used for Product records, monitoring results, and opening product pages. Product persistence requires a meaningful title, product-specific URL, and strong product evidence.
- `publicCartUrl` is only an optional manual shortcut extracted from public page markup when a valid product page/listing also exposes it.
- Cart, basket, add-to-cart, checkout, order, and payment URLs are ignored as monitor source URLs and product URLs.
- The app does not request `publicCartUrl` automatically. The user must click the UI or Discord link manually.
- No automatic checkout, automatic purchasing, cart submission, order submission, or payment automation is implemented.
- Relevant monitored targets are sealed TCG products such as boosters, booster boxes, booster bundles, displays, ETBs, blisters, tins, premium collections, starter decks, battle decks, and One Piece Card Game sealed products. English and Japanese products are preferred. Detectable German, French, Italian, Spanish, Korean, or Chinese localized card products are skipped by default unless a future explicit rule changes that policy.
- Accessories and non-target pages are skipped before persistence and alerting: albums, binders, folios, card sleeves, deck boxes, top loaders, playmats, figures, toys, posters, stickers, articles, guides, external profile pages such as Firmy.cz, and generic labels like `Bestseller`, `Na prodejně`, or `Nedostupné`.
- Existing incorrectly extracted products are not deleted automatically. Ignore them manually from Products if they were created before this validation fix.
- The Products page can also bulk-ignore the currently visible `Would skip now` rows. This is a manual cleanup helper for old data only; it does not affect scanning logic and does not remove records.

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

### Discovery Dashboard

From Stores, use `Discover` to queue a source discovery job. The worker checks:

- configured listing URLs
- `/sitemap.xml` and `/sitemap_index.xml`
- public RSS/Atom candidates such as `/rss`, `/rss.xml`, `/feed`, and `/atom.xml`
- JSON-LD product data
- OpenGraph URL metadata
- public category links containing Pokemon, Pokémon, TCG, One Piece, or card keywords

Discovery candidates are validated with the least suitable public monitor mode. Candidates with validated relevant sealed TCG products are shown as `Target found` and can be promoted to the primary source. Category-only pages, navigation buttons, stock labels, pagination, load-more links, publisher/listing pages, articles, external profiles, and accessories can remain source context or be skipped, but do not count as products and do not create events or Discord alerts.

Scan and discovery diagnostics include page-level extraction signals when available:

- `pageReportedCount`, for text such as `Nalezeno 103 výsledků`
- `rawExtractedCount`
- `relevantFound`
- `inStockRelevantFound`
- `skippedByReason`
- a warning when a page likely needs pagination, lazy loading, or multiple active source candidates because the page reports much more than the parser extracted

Alza may return HTTP 403 or a Cloudflare human-check page during public Playwright validation. That state is treated as `limited` / `needs attention`; the app must fail safely and must not bypass the block.

Product title cleanup removes category badges, stock chips, load-more controls, duplicated price text, and store UI labels such as `Bestseller`, `Na prodejně`, `Skladem online`, and `DMOC`. The scanner then applies the sealed-product relevance filter before Product persistence, Event creation, and Discord delivery.

Notification delivery logs include route diagnostics for new deliveries. The Logs page shows whether a message used store-first routing, fallback routing, or optional high-priority multi-route, plus the matched webhook record name without exposing the webhook URL. This helps verify that high-priority store events stay in the store channel when `DISCORD_MULTI_ROUTE_HIGH_PRIORITY=false`.

Product test alerts on the Products page use the same store-first routing as normal product events. They never use the `TEST` target or a random active `DEFAULT` store webhook. Settings webhook tests remain separate and test exactly the selected webhook.

Out-of-stock products are tracked for future restock detection, but they do not send noisy `NEW_PRODUCT` or `SOLD_OUT` Discord alerts. A new product with `UNKNOWN` stock, no price, no public cart shortcut, and no availability signal is also tracked without an immediate alert. If a tracked product later changes from unavailable to available, the `RESTOCK` event remains actionable and routes through the store-specific webhook first.

Scan logs include a compact diagnostic summary: scan sources, raw product count, relevant sealed product count, in-stock relevant count, skipped count and reasons, product create/update/unchanged counts, event count, notification sent/skipped/failed counts, and notification skip reasons. Full Discord webhook URLs are never logged.

Recommended discovery test flow:

1. Run `Discover` for one paused store.
2. Promote only a candidate marked `Target found`.
3. Run `Scan`.
4. Check Products for real product detail URLs, prices/images/product IDs, and no category/control labels.
5. Check that accessory products such as albums, folios, sleeves, deck boxes, playmats, figures, guide articles, single cards, category tiles, and Firmy.cz profiles are listed in scan logs as skipped non-targets and do not create new Events.
6. Check notification delivery history: store events should go to the store channel first, `PRODUCT_UPDATED` alerts are skipped unless enabled, non-actionable out-of-stock/unknown items are tracked without alerts, and Discord rate-limit retry details are logged when applicable.

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
- Czech store preset safety, URL paths, polling intervals, paused defaults, and routing metadata
- source candidate seed metadata and Playwright-mode preset coverage
- keyword rule matching
- price parsing
- product parsing and normalization
- rendered product-card extraction
- parser rejection of cart/add/checkout URLs as product URLs
- manual `publicCartUrl` purchase-assist metadata
- source candidate/product URL/publicCartUrl validation boundaries
- Knihy Dobrovský category/control labels rejected as products
- discovery target-found status based only on validated products
- duplicate product detection
- event generation and state hashing
- Discord payload formatting
- Discord 429 retry, throttling, and webhook URL redaction
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
nvm use
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
- If Discord returns HTTP 429, the worker reads `retry_after` or `Retry-After`, waits, retries conservatively, and marks delivery as failed only after retries are exhausted.
- Notification logs preserve duplicate prevention and cooldown behavior; rate-limit logs include target/webhook name, attempts, retry delay, and final outcome without full webhook URLs.

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
