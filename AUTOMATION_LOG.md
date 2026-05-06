# Automation Log

Continuous branch: `daily-autonomous-improvements`

## 2026-05-06

### 06:17 CEST - Cycle 1

Work continued from previous unmerged PR: no. `main` already includes PR #16 (`feature-import-best-ideas-and-ui-polish`), and this branch was created from current `main`.

What was inspected:

- Git status and recent commit history.
- Existing local branches/remotes for `daily-autonomous-improvements`.
- Open PR lookup for this branch; `gh` is not installed locally, so PR lookup will use the GitHub connector when needed.
- Recent local database state through Prisma read-only queries:
  - stores
  - recent products
  - recent events
  - recent notification logs
  - recent operational logs
  - recent scan jobs
  - source candidates
  - keyword rules
  - Discord webhook routing records without printing webhook URLs
- Existing shared relevance filter and worker parser/scanner tests.

Problems found:

- Knihy Dobrovský recent scan was mostly clean and store-first routing appears configured correctly through `cz-knihy-dobrovsky`.
- A remaining false positive was found in recent Products: `Pokémon TCG: Scarlet Violet 01 - Mini Album + booster`.
- Root cause: the sealed TCG filter allowed the `booster` token before treating plain `album` / `mini album` as an accessory signal. Existing rules rejected `kroužkové album`, `album na`, and several album variants, but not this exact title form.
- Existing local worktree has pre-existing unrelated dirty files:
  - `apps/worker/package.json`
  - `package-lock.json`
  - several `* 2.ts` / duplicate local files
  - `.env.backup`
  These were not modified for this cycle and must not be staged accidentally.

What changed:

- Tightened shared accessory detection so `album` and `mini album` override generic sealed matching even when the title also includes `booster`.
- Added a regression case for `Pokémon TCG: Scarlet Violet 01 - Mini Album + booster`.

Intentionally not changed:

- No monitor fetching behavior.
- No Playwright/network behavior.
- No Discord routing logic.
- No database data deletion or cleanup.
- No automatic purchasing, checkout, cart requests, proxy rotation, CAPTCHA handling, or bypass logic.
- Did not implement multiple active source candidates yet; that remains a larger safe-design task.

Test results:

- `npm run test -w @tcg-monitor/shared` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Whether historical already-created accessory Products should get a safe UI bulk-ignore workflow later. No automatic data deletion should be done.
- Whether `Mini Album + booster` should always be ignored across all stores. Current decision: yes, because the user explicitly wants albums/accessories skipped and denylist should override generic booster matching.

Next planned step:

- Inspect recent products from other stores with persisted counts (`Smarty`, `TCG Karty`, `Pompo`, `Veselý Drak`, `Hra na netu`) for similar false positives and add fixture-based tests if a recurring pattern appears.

Current PR ready to merge:

- Not yet. This is the first hourly cycle on the daily branch and is intentionally small. Final PR should be prepared at 22:00 after full verification.

### 06:20 CEST - Cycle 2

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Last 250 persisted products, compared against the current shared relevance filter.
- Recent notification logs grouped by target/status.
- Products outside Knihy Dobrovský that still pass the current relevance filter.

Problems found:

- Many historical false positives from `Smarty`, `TCG Karty`, `Pompo`, `Hra na netu`, `Veselý Drak`, and `Alza` would already be rejected by the current relevance filter, so they appear to be old data rather than a current parser regression.
- Recent notification logs confirmed the previously found `Mini Album + booster` false positive was sent before this cycle's filter tightening.
- Additional generic labels from historical scans should be rejected earlier as non-product content so they are not counted as product candidates:
  - `číst celé`
  - `Detail`
  - `Slide`
  - `Sběratelské karty`
  - `Jednotlivé karty`
  - `Boostery`
  - `pokémon karty`

What changed:

- Extended `isNonProductContentTitle` with exact-match generic UI/category/article labels found in local data.
- Extended the shared regression test list with the same real examples.

Intentionally not changed:

- No database cleanup.
- No Discord routing changes.
- No changes to monitor fetching or Playwright behavior.
- No changes to allowed sealed TCG products such as boosters, booster boxes, mini tins, ETBs, blisters, premium collections, or One Piece sealed products.

Test results:

- `npm run test -w @tcg-monitor/shared` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Some accepted products such as `Tech Sticker Collection` may or may not be relevant sealed TCG products depending on contents. Leave unchanged until verified from product details, because over-filtering could hide valid sealed collection products.

Next planned step:

- Inspect whether old false positives can be safely surfaced in the UI as "would now be skipped" without deleting data, or continue with another small parser regression if new scan data appears.

Current PR ready to merge:

- Not yet. Changes are safe so far, but the daily branch should wait for the 22:00 full verification and final PR.

### 06:34 CEST - Cycle 3

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Products UI implementation.
- Products API shape.
- Current automation log state.

Problems found:

- Historical products that the current relevance filter would now skip are still visible in Products with no visual warning.
- The Products UI allowed a manual test alert action for those historical false positives, which could send a Discord test alert for something the scanner would no longer persist today.
- The web workspace imports the built `@tcg-monitor/shared` package in tests, so web tests need `npm run build -w @tcg-monitor/shared` after shared source changes.

What changed:

- Added `apps/web/src/lib/product-quality.ts` with `wouldSkipProductNow`, reusing the shared sealed TCG relevance filter.
- Added web tests for the helper.
- Updated Products UI:
  - shows `Would skip now` on historical products that current filtering treats as non-target/noise
  - disables the manual `Test` alert button for those products
  - keeps `Open product`, optional manual cart link, and ignore/restore actions intact

Intentionally not changed:

- No automatic ignore or deletion of old data.
- No API behavior change.
- No worker/scanner/fetching behavior change.
- No Discord routing change.

Test results:

- Initial `npm run test -w @tcg-monitor/web` failed because `@tcg-monitor/shared` build output was stale after shared source edits.
- `npm run build -w @tcg-monitor/shared` passed.
- Re-run `npm run test -w @tcg-monitor/web` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Whether to add a bulk-ignore action for `Would skip now` products. That would be useful, but should be a separate deliberate UI/API task with confirmation and no automatic data deletion.

Next planned step:

- Inspect Events and notification history for duplicate alert patterns or route confusion after the filtering improvements.

Current PR ready to merge:

- Not yet. The branch remains safe, but final verification and PR preparation are reserved for 22:00.

### 06:43 CEST - Cycle 4

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Events UI and Events API response shape.
- Recent notification logs for duplicate patterns and target routing.

Problems found:

- A sandbox read-only Prisma inspection initially failed because `tsx` could not create its IPC pipe inside the sandbox. It was rerun successfully with approval outside the sandbox.
- Recent notification logs show old duplicate noise around `TCG Karty|Slide`:
  - duplicate `PRODUCT_UPDATED` logs were `SKIPPED`
  - duplicate `NEW_PRODUCT` logs were `FAILED`
- Store target summaries showed older `HIGH_PRIORITY` sends for `Smarty` and `TCG Karty`. These logs are from earlier noisy scans and should be watched, but this cycle did not change routing because store-first routing has dedicated tests and changing delivery logic here would be riskier than a UI diagnostic improvement.
- Events timeline had no warning for historical events whose product would now be skipped by the current relevance filter.

What changed:

- Updated Events UI to reuse the web `wouldSkipProductNow` helper.
- Historical events tied to products that the current filter would skip now show a `Would skip now` badge and a short explanation.

Intentionally not changed:

- No notification delivery/routing logic changes.
- No database cleanup.
- No automatic ignoring of historical products/events.
- No scanner, parser, or fetching behavior changes.

Test results:

- `npm run test -w @tcg-monitor/web` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Whether the older `HIGH_PRIORITY` rows for `Smarty` and `TCG Karty` were created before the store-first routing fix or indicate a remaining edge case. Needs another read-only check against exact timestamps/config before changing routing.

Next planned step:

- Inspect route-resolution tests and recent notification timestamps to decide whether a small route diagnostics improvement is useful without touching delivery logic.

Current PR ready to merge:

- Not yet. The branch is still safe and focused on relevance/UI diagnostics, but final PR waits for full daily verification.

### 06:57 CEST - Cycle 5

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Worker notification routing implementation.
- Worker notification routing tests.
- Historical notification target summary from the previous cycle.

Problems found:

- Store-first routing implementation already returns the store webhook before fallback targets and ignores rule fallback targets when a store webhook exists.
- Existing tests covered high-priority store events with a non-high rule target, but did not explicitly cover the exact historical concern: a high-priority store product with an explicit keyword rule target of `HIGH_PRIORITY`.

What changed:

- Added a worker regression test proving that an explicit `HIGH_PRIORITY` keyword rule target does not replace the store webhook when the store-specific webhook is configured and multi-route is disabled.

Intentionally not changed:

- No routing implementation change because the existing behavior is already correct.
- No notification log edits or cleanup.
- No Discord delivery behavior change.

Test results:

- `npm run test -w @tcg-monitor/worker -- notifications.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Historical `HIGH_PRIORITY` rows for `Smarty` and `TCG Karty` likely came from earlier code/data before the store-first fix, inactive/missing store webhook at send time, or multi-route config at the time. The current route unit test now locks the intended behavior.

Next planned step:

- Continue with small diagnostics or tests only unless new scan data shows a current false positive.

Current PR ready to merge:

- Not yet. The branch remains safe; final PR should wait for the 22:00 full verification.

### 07:02 CEST - Larger Improvement Cycle

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Worker scanner implementation.
- HTML and Playwright monitor implementations.
- Store source candidate API route.
- Current source candidate README section.

Problems found:

- Earlier README/UI said multiple active candidate scanning was only planned.
- Actual monitor implementations already scan every URL in `Store.listingUrls`:
  - `HtmlMonitor.scan` loops over all listing URLs.
  - `PlaywrightMonitor.scan` renders all listing URLs.
  - scanner persistence deduplicates products by canonical store URL through the existing unique product constraint and monitor `uniqueProducts` helpers.
- The missing piece was controlled UI/API management of more than one source URL. Existing `Promote` replaced `listingUrls` with a single candidate URL, which could make Knihy Dobrovský miss products from other validated category/sort/publisher sources.

What changed:

- Added API source URL helper functions:
  - dedupe source URLs
  - add candidate as scan source
  - promote candidate to primary while preserving same-mode scan sources
  - remove a scan source while keeping at least one source
- Added API tests for those helper functions.
- Updated Stores API:
  - `promote` now preserves same-mode scan sources and moves the candidate to the first/primary URL
  - new `activate` endpoint adds an active same-mode candidate to `listingUrls`
  - new `deactivate` endpoint removes a candidate URL from `listingUrls`, but rejects removing the last scan source
  - candidates with a different monitor mode cannot be added as extra scan sources; they must be promoted as primary to switch mode safely
- Updated Stores UI:
  - shows scan source count
  - labels candidates as `Primary source` or `Scan source`
  - adds `Add source` and `Remove source` controls
  - shows `Mode mismatch` when a candidate cannot be mixed into the current store mode
- Updated README to document the now-supported conservative multi-source behavior.

Intentionally not changed:

- No monitor fetching behavior.
- No per-candidate monitor mode execution.
- No database schema migration.
- No network behavior or adapter logic changes.
- No Discord routing changes.
- No checkout/purchase automation.

Test results:

- `npm run test -w @tcg-monitor/api -- source-candidates.test.ts` passed.
- `npm run test -w @tcg-monitor/web` passed.
- `npm run test -w @tcg-monitor/worker -- notifications.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Full per-candidate enable/disable metadata in Prisma may still be useful later, but the current conservative implementation reuses `Store.listingUrls` and avoids a migration.
- Per-source scan health is still summarized at candidate/store level, not per active URL inside one scan job.

Next planned step:

- Run a full test/build cycle later before the 22:00 PR. If more scan data appears, verify that Knihy Dobrovský can keep `/booster` plus other validated same-mode sources without duplicate products/events.

Current PR ready to merge:

- Closer, but still not final. This is the first larger behavior change of the day; it needs full verification and preferably local UI smoke testing before the 22:00 PR is marked ready.

### 08:39 CEST - Cycle 7

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Notification logs UI.
- API notification log shape from the existing logs route context.
- Current automation notes from the previous cycles.

Problems found:

- Product and Events pages already show `Would skip now` diagnostics for historical false positives, but Notification delivery history did not.
- This made it harder to trace old Discord alerts back to products that the current sealed TCG relevance filter would now block.
- The API already includes enough product data on notification logs, so no backend or delivery change was needed.

What changed:

- Added the same current relevance diagnostic to notification delivery history.
- Historical notification rows now show a `Would skip now` badge when the linked product would be blocked by the current sealed TCG filter.
- Extended the web notification log product type to include `game` and `category`, matching the API payload used by the shared quality helper.

Intentionally not changed:

- No notification delivery/routing logic.
- No Discord webhook behavior.
- No parser, monitor, or fetching behavior.
- No data cleanup or automatic ignore action.

Test results:

- `npm run test -w @tcg-monitor/web` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- A local browser smoke test of Logs/Products/Stores would be useful before the final daily PR, especially after the larger source-candidate UI change.

Next planned step:

- Continue with one larger but safe improvement area: either source candidate UI smoke testing or a targeted duplicate-alert diagnostic, depending on the next scan/log data.

Current PR ready to merge:

- Not yet. The branch remains safe and focused, but needs final full verification and PR preparation at 22:00.

### 09:50 CEST - Cycle 8

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Dashboard page.
- Dashboard product table component.
- Dashboard API summary type.
- A read-only Prisma inspection attempt for recent Products, Events, and Notification logs.

Problems found:

- Products, Events, and Notification logs now expose `Would skip now` diagnostics, but the main Dashboard still showed latest products/events without that warning.
- That meant the first screen could still make historical false positives look like current valid targets.
- Read-only DB inspection could not run because PostgreSQL was not reachable at `localhost:5432`; no data was modified.

What changed:

- Added current relevance diagnostics to the Dashboard latest products table.
- Added current relevance diagnostics to the Dashboard latest events list.
- Extended dashboard web types so latest events and latest products can be evaluated with the same shared `wouldSkipProductNow` helper.

Intentionally not changed:

- No backend scanner/parser/fetch behavior.
- No Discord routing or delivery behavior.
- No database cleanup or mutation.
- No automatic ignoring of historical records.

Test results:

- `npm run test -w @tcg-monitor/web` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- A later cycle should repeat the read-only DB inspection once Postgres is running, then compare recent Products/Events/Notifications against the dashboard diagnostics.

Next planned step:

- Continue with either a local browser smoke test or a DB-backed quality audit once services are available.

Current PR ready to merge:

- Not yet. The branch remains safe, but the larger source-candidate workflow and dashboard diagnostics need final full verification before PR.

### 10:14 CEST - Larger Cleanup Workflow Cycle

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Git status.
- Products API route and existing product ignore behavior.
- Products page UI.
- Product quality diagnostics added in earlier cycles.
- README sections for product quality and historical false positives.

Problems found:

- The UI could identify historical products that the current sealed TCG filter would skip, but cleanup still required ignoring each product one by one.
- This is tedious after a noisy scan and makes the dashboard less autonomous in day-to-day operation.
- Existing incorrect products should not be deleted automatically, but a confirmed manual bulk-ignore action is safe and useful.

What changed:

- Added `POST /api/products/bulk-ignore`.
- The endpoint accepts up to 100 product IDs, deduplicates IDs, ignores only existing products, and writes/updates the ignored-product audit reason.
- Added Products UI action `Ignore visible skipped (N)`.
- The action only targets visible, non-ignored rows that the current sealed TCG filter would skip.
- The action requires a browser confirmation, does not delete records, and can be reversed with the existing per-product Restore action.
- Added API route tests for invalid payloads and successful deduplicated bulk ignore.
- Updated README to document the manual historical cleanup helper.

Intentionally not changed:

- No automatic cleanup.
- No scanner/parser/fetch behavior.
- No Discord routing or delivery behavior.
- No changes to current product persistence rules.
- No database schema migration.

Test results:

- `npm run test -w @tcg-monitor/api -- products.test.ts` passed.
- `npm run test -w @tcg-monitor/web` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Once Postgres is running, test this against real historical false positives on the Products page before marking the daily PR ready.
- A future step could add a server-side quality filter, but the current page-scoped action is intentionally conservative.

Next planned step:

- Perform local UI smoke testing when services are available, then run full verification before the daily PR.

Current PR ready to merge:

- Not yet. This is a useful larger workflow change and needs the normal 22:00 full verification.

### 11:01 CEST - Real Store Discovery/Scan Audit

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` with no PR opened yet for the daily branch.

What was inspected:

- Local Postgres/Redis state.
- Real Czech store presets and current source candidates.
- Discovery and scan behavior through the existing worker services.
- Recent scan logs, products, and skipped non-target products.

Problems found:

- Knihy Dobrovský, Alza, Cardstore, Pompo, Smarty, and Gengar produced only currently relevant persisted products in the audit window.
- Discovery/scan safely skipped non-target/category/menu/article/accessory rows instead of persisting them.
- Luxor, Alza sitemap products, Dráčik, Hra na netu, TCG Karty, Tolarie, and Veselý Drak either found zero relevant products, had no active target source, or timed out safely.
- TCG Karty still had stale `ACTIVE` source candidates pointing at homepage/info/privacy pages such as `/`, `/o-nas`, `/spustili-jsme...`, and `/osobni-udaje-*`.
- Tolarie had a stale article-style source candidate that should not be usable as a scan source.

What changed:

- Tightened source candidate URL safety:
  - homepage URLs are no longer valid scan source candidates
  - article/blog/guide pages are rejected
  - privacy/cookie/personal-data pages are rejected
  - about/contact/info pages are rejected
  - cart/add/checkout/payment URLs remain rejected
- Discovery now demotes existing stale `ACTIVE` candidates with unsafe source URLs to `NEEDS_ATTENTION`.
- Stores API now rejects Promote/Add source for unsafe stale candidates.
- Added worker/API regression tests for TCG Karty and Tolarie-style stale source URLs.
- Re-ran TCG Karty cleanup with discovery candidate limit `0` to demote stale bad candidates without a long render pass.
- Updated README to document that informational URLs are not valid scan sources.

Real audit results:

- Alza: discovery found 5 active candidates and scan found 94 relevant products; 24 non-target/category/article rows skipped.
- Alza sitemap products: discovery found 0 active candidates and 0 products.
- Cardstore: discovery found 15 active candidates and scan found 91 relevant products; 159 non-target/category/menu rows skipped.
- Dráčik: discovery timed out in the longer audit; direct scan found 0 products, 0 events, and skipped 16 non-target rows.
- Gengar.cz: discovery timed out in the shorter audit; direct scan found 8 relevant products and skipped 27 non-target rows.
- Hra na netu: discovery timed out; direct scan found 0 products, 0 events, and skipped 19 non-target rows.
- Knihy Dobrovský: discovery found 8 active candidates and scan found 69 relevant products; 3 non-target rows skipped.
- Luxor: discovery found 0 active candidates and 0 products.
- Pompo: scan found 27 relevant products and skipped 18 non-target rows. Current short discovery returned 0 active candidates, but existing safe active source scanned correctly.
- Smarty: discovery found 1 active candidate and scan found 81 relevant Pokémon/One Piece products; 19 non-target rows skipped.
- TCG Karty: direct scan found 0 products/events; stale unsafe active info-page candidates were demoted to `NEEDS_ATTENTION`.
- Tolarie: discovery found 0 active candidates and scan found 0 products/events; stale article source was no longer selected.
- Veselý Drak: discovery found 0 active candidates; scan timed out at the configured 5s Playwright timeout and persisted 0 products/events.

Intentionally not changed:

- No HTTP 403/robots/CAPTCHA/queue bypass.
- No proxy rotation or evasion.
- No monitor fetching behavior changes.
- No automatic checkout/purchasing/cart requests.
- No automatic deletion of existing Products or Events.

Test results:

- `npm run test -w @tcg-monitor/worker -- parser-utils.test.ts discovery.test.ts` passed before the final source-safety refinement.
- `npm run test -w @tcg-monitor/worker -- parser-utils.test.ts` passed after the final source-safety refinement.
- `npm run test -w @tcg-monitor/api -- source-candidates.test.ts` passed.

Open questions:

- Dráčik, Hra na netu, TCG Karty, Luxor, Tolarie, and Veselý Drak need better safe public source URLs or feeds; current behavior is safe but not useful enough.
- Pompo has a useful existing active source, but short discovery did not rediscover it with one candidate; a future improvement should make discovery ranking prefer configured listing URLs before sitemap/RSS noise.

Next planned step:

- Add a bounded discovery timeout/diagnostic improvement so one slow Playwright candidate cannot stall a full-store audit or admin-triggered discovery for too long.

Current PR ready to merge:

- Not yet. The source-safety changes are good and tested in targeted tests, but final full verification is still reserved for 22:00.

### 11:31 CEST - New Store Presets and Preview-Driven Relevance Fix

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements`.

What was inspected:

- Current git status and existing dirty branch state.
- Czech store preset definitions and tests.
- README Czech preset table and local testing instructions.
- Existing discovery ordering in `apps/worker/src/services/discovery.ts`.
- Playwright preview scans for new candidate stores without seed writes or DB mutation.

Problems found:

- Discovery checked sitemap/RSS metadata before configured listing URLs, so noisy metadata could consume the candidate limit before the store's configured public categories were validated.
- Najáda's broad One Piece category exposed model kits such as `One Piece: Grand Ship Collection Model Kit`, which were incorrectly relevant because the old filter treated `collection` as enough.
- Najáda's Pokemon category also has real Pokemon boosters with ambiguous titles such as `Snow Hazard Booster (asijsky)` that need category context to be classified as Pokemon.
- Najáda exposes category links such as `/pokemon/booster-boxy`; those are valid source candidates but must not become Product records.
- Professor Onyx returned relevant Pokemon/One Piece products, but some duplicate raw cards shared the same canonical URL.
- Kuma returned HTTP 429 during the safe preview scan and should remain paused without bypass attempts.

What changed:

- Added paused presets for Najáda, Professor Onyx, and Kuma with store-specific webhook names `cz-najada`, `cz-professor-onyx`, and `cz-kuma`.
- Updated Gengar's preset note to reflect the local audit: direct scan found relevant products, broader discovery timed out.
- Discovery now validates configured listing URLs before sitemap/RSS metadata so manually reviewed categories get first chance to become source candidates.
- Product-card parsing can infer Pokemon/One Piece from the category/page URL for ambiguous booster names, while known non-target games such as Lorcana, Yu-Gi-Oh, Star Wars, and MTG remain `UNKNOWN`.
- Added model-kit/ship-model merchandise to the non-target filter.
- Added category-title/category-URL guards for paths such as `/pokemon/booster-boxy`.
- Added scanner-level deduplication by EAN, SKU, or canonical URL before persistence/events/Discord alerts.
- Updated README with the new stores, statuses, webhook names, and safe testing notes.

Preview results:

- Najáda: safe Playwright preview found 119 raw candidates and 30 deduped relevant Pokemon/One Piece products after filtering. Model kits and category pages are now skipped.
- Professor Onyx: safe Playwright preview found 58 raw candidates and 7 deduped relevant products after filtering.
- Kuma: safe Playwright preview returned HTTP 429 for `https://www.kuma.cz/pokemon-karty/`; left paused and documented as not bypassed.

Intentionally not changed:

- No HTTP 429/403 bypass, proxy rotation, CAPTCHA solving, queue bypass, private endpoints, or fetch-behavior changes.
- No automatic checkout/purchase/cart requests.
- No DB seed run, so existing local store configuration and user data were not overwritten.

Test results:

- `npm run test -w @tcg-monitor/shared -- index.test.ts cz-store-presets.test.ts` passed.
- `npm run test -w @tcg-monitor/worker -- scanner.test.ts parser-utils.test.ts discovery.test.ts` passed.
- `npm run test -w @tcg-monitor/api -- source-candidates.test.ts` passed earlier in this cycle before the final relevance tweaks.

Open questions:

- Najáda and Professor Onyx should still be enabled one by one in the UI and reviewed in Products/Events before scheduled scanning.
- Kuma needs a later normal retry; if it keeps returning 429, it should stay paused or require an allowed feed/source from the store.
- More stores can be added, but only after public category/feed URLs are verified.

Next planned step:

- Run full typecheck and a broader test/build pass when preparing the 22:00 deliverable, then decide whether to promote Najáda/Professor Onyx from candidate to manually testable stores in local DB via seed.

Current PR ready to merge:

- Not yet. The changes are targeted and passing focused tests, but the daily branch still needs full verification before PR/update.

### 12:19 CEST - Store Source Guardrails and Routing Diagnostics

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements`.

What was inspected:

- Store API create/update flow.
- Source candidate helper functions.
- Stores UI source candidate controls.
- Worker Discord routing and delivery logging.
- Logs UI notification delivery table.

Problems found:

- Source candidates were protected when promoted/activated, but direct Store create/update could still save unsafe listing URLs if entered manually.
- Notification logs showed target/status/error, but future debugging still needed a clear reason for store-first vs fallback vs high-priority multi-route delivery.
- Multiple scan sources are already supported through `Store.listingUrls`; the missing piece was stricter API guardrails and clearer route diagnostics.

What changed:

- Store create/update now validates every listing URL with the same source safety rules used by source candidates.
- Unsafe cart/add/checkout/order/payment, homepage, article/guide/info/privacy/contact, off-store, and non-http(s) listing URLs are rejected before saving.
- Added an API route regression test proving unsafe listing URLs are rejected before Prisma create.
- Discord delivery logs now include route diagnostics in `response.route` for future deliveries:
  - route reason
  - webhook record name
  - store-first vs fallback
  - multi-route high-priority flag
  - whether a store webhook was configured
- Logs UI now surfaces those route diagnostics without exposing full webhook URLs.
- README now documents safe source save validation and notification routing diagnostics.

Intentionally not changed:

- No monitor fetching behavior changes.
- No proxy/evasion/CAPTCHA/403/429 bypass.
- No checkout/purchase/cart requests.
- No DB data cleanup or destructive migration.

Test results:

- `npm run test -w @tcg-monitor/api -- stores.test.ts source-candidates.test.ts products.test.ts` passed.
- `npm run test -w @tcg-monitor/worker -- notifications.test.ts discord.test.ts scanner.test.ts parser-utils.test.ts discovery.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- Existing historical notification logs do not have `response.route`; only new deliveries will show the route explanation.
- The Stores list still shows candidate summaries from the included page payload; a future improvement can add aggregated per-store source health counts from the API.

Next planned step:

- Continue with a UI/API diagnostic pass for per-store source health aggregation and/or a safe manual workflow for historical false-positive cleanup.

Current PR ready to merge:

- Not yet. This is safe so far, but final full verification remains scheduled for 22:00.

### 12:25 CEST - Source Health Score and Best Safe Promotion

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements`.

What was inspected:

- Existing multiple scan source support through `Store.listingUrls`.
- Stores API list/detail responses.
- Stores UI source candidate cards and source health summary.
- Source candidate safety helpers and tests.

Problems found:

- The UI could show source candidate raw/relevant/skipped numbers, but there was no single backend-calculated health score or recommendation status.
- Choosing the best source was still manual candidate-by-candidate, even when Discovery had enough data to rank safe validated candidates.
- Store list source summaries depended on the included candidate rows; they needed a backend aggregate to be reliable.

What changed:

- Added `source-health` API service with:
  - candidate metrics
  - recommendation statuses: `RECOMMENDED`, `TESTABLE`, `NOISY`, `EMPTY`, `NEEDS_ATTENTION`, `UNSAFE`, `PENDING`
  - source score
  - best safe candidate selection
  - per-store source health summary
- Stores API list/detail now return enriched source candidates and `sourceHealth` aggregate data.
- Added explicit `POST /api/stores/:id/source-candidates/promote-best`.
- The best-source action promotes only a safe validated candidate and only after admin action; it does not enable the store automatically.
- Stores UI now shows recommendation badges, scores, best-source reason, and a confirmed `Promote best safe source` button.
- README now documents source recommendations and the explicit best-source promotion workflow.

Intentionally not changed:

- No automatic store enabling.
- No fetch behavior changes.
- No bypass/evasion/proxy/CAPTCHA behavior.
- No checkout/purchase/cart automation.

Test results:

- `npm run test -w @tcg-monitor/api -- source-health.test.ts source-candidates.test.ts stores.test.ts` passed.
- `npm run typecheck` passed.
- `git diff --check` passed.

Open questions:

- A future step can store source health snapshots historically, but the current implementation intentionally computes health from current candidate rows without a migration.
- `Promote best safe source` is explicit admin action only; a future automation could suggest it, but not auto-run it.

Next planned step:

- Add a safe validation workflow button that queues Discovery, promotes best source only after review, then queues a scan. Keep it manual and visible.

Current PR ready to merge:

- Not yet. Focused tests and typecheck pass, but daily full verification remains scheduled for 22:00.

### 12:34 CEST - Draft PR Preparation

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements`.

What was inspected:

- Full git status and pending untracked files.
- Verification commands before PR.
- Build behavior for root and web workspaces.

What changed:

- No feature code changed in this checkpoint.
- Prepared the branch for a draft PR earlier than 22:00 because the daily branch now contains a coherent, reviewable set of source health, product quality, routing diagnostics, store preset, and UI improvements.

Verification:

- `npm run typecheck` passed.
- `npm test` passed across API, web, worker, and shared workspaces.
- `git diff --check` passed.
- Initial `npm run build` reached `next build` and then produced no output for several minutes, so the hung process was terminated.
- `CI=1 NEXT_TELEMETRY_DISABLED=1 npm run build -w @tcg-monitor/web` passed.
- `CI=1 NEXT_TELEMETRY_DISABLED=1 npm run build` passed from the repository root.

Staging notes:

- Stage only intended project changes.
- Do not stage `.env.backup`, `.dockerignore 2`, or duplicated `* 2.ts` files.

Current PR ready to merge:

- Draft PR is appropriate now. It should remain draft until the UI is manually reviewed and any reviewer feedback is handled.

### 12:54 CEST - Local Dependency Install Recovery

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` / PR #17.

What was inspected:

- User-reported local setup sequence where `npm install` hung before Prisma commands.
- Running npm processes and the previous npm debug behavior.
- Existing `node_modules` state, Prisma commands, typecheck, tests, and build.

Problems found:

- A stale/hung `npm install` process was still running locally.
- The hang was caused by the local `node_modules` tree/npm idealTree traversal, not by Prisma, migrations, seed data, or app code.
- The shell default was Node `v24.15.0` with npm `11.12.1`; the project is aligned with Node 20 typings and now documents Node 20 LTS for local development.

What changed:

- Stopped the hung npm process.
- Removed and recreated dependency folders with Node 20 using `npm ci --no-audit --no-fund`.
- Added `.nvmrc` with Node 20.
- Updated README local setup and verification commands to run `nvm use`, plus a clean reinstall fallback if npm hangs on a stale `node_modules` tree.

Intentionally not changed:

- No application logic.
- No monitoring/fetching behavior.
- No Discord routing behavior.
- No database schema or seed behavior.

Test results:

- `npm ci --no-audit --no-fund` passed.
- `npm run prisma:generate` passed.
- `npm run prisma:migrate` passed; database was already in sync.
- `npm run prisma:seed` passed.
- `npm run typecheck` passed.
- `npm test` passed.
- `CI=1 NEXT_TELEMETRY_DISABLED=1 npm run build` passed.

Remaining risk:

- Users already on a corrupted `node_modules` tree may still need the documented clean reinstall once.

Next planned step:

- Push this small setup/documentation fix to the existing draft PR after reviewing the diff.

Current PR ready to merge:

- Still draft. The local setup issue is fixed and verified, but the daily PR should remain draft until manual UI review.

### 16:29 CEST - Log-Driven Discord Routing And Alert Noise Fix

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` / PR #17.

What was inspected:

- Current git status and untracked local backup files.
- Recent Products, ProductEvents, NotificationLogs, ScanLogs, ScanJobs, SourceCandidates, Stores, and DiscordWebhook records through read-only Prisma inspection.
- Product Test API route, Products page test action, worker queue handler, notification routing code, Discord delivery code, scanner persistence/event/notification flow, keyword rules, and stock/relevance filters.
- Safe dry-run monitor previews for configured CZ stores without persistence, events, or Discord sends.

Exact bad records/examples found:

- Alza product `Pokémon TCG: SV08 Surging Sparks - Booster - Pokémon karty` has the correct store and `cz-alza` store webhook assignment.
- Its Product Test notification log was `target=DEFAULT`, `status=SENT`, and had `response.route=null`, which means the old Product Test path bypassed store-first route diagnostics.
- Several earlier store scans had noisy historical alerts for unavailable `UNKNOWN` products and non-target/category/product-quality misses, including examples like `Tcgkarty.cz na Firmy.cz`, `číst celé`, `Detail`, `Slide`, `Fotbalové karty`, `Kusové karty Pokémon`, `Tolarie`, and `https://www.bandai-tcg-plus.com/`.
- Store summaries showed many notifications skipped correctly because `PRODUCT_UPDATED` delivery is disabled by default, but this was not visible enough in scan summaries.

Root cause:

- `/api/products/:id/test-alert` always queued `target: DEFAULT`.
- `sendProductTestAlert` treated any requested target as explicit and selected the newest active webhook with that target.
- Store-specific webhooks are also stored as `target=DEFAULT`, so a DEFAULT fallback could choose an unrelated store webhook, such as `cz-vesely-drak`, instead of the product's store webhook.
- Target fallback lookup did not exclude store-assigned webhooks.

Why Discover/Scan produced few or no notifications:

- In many cases this was correct: scans found 0 relevant products, products were already known, `PRODUCT_UPDATED` notifications were disabled, or products had `UNKNOWN` stock with no price/cart/availability signal.
- In other cases this was a bug/noise risk: `NEW_PRODUCT` alerts were still allowed for clearly non-actionable unavailable or unknown-stock products, and fallback routing could pick unrelated store webhooks.

Stores dry-run tested safely:

- Alza: raw 211, relevant 25, in-stock relevant 0. Source works for discovery but products are mostly unknown-stock/no price, so future new alerts should be tracked without noisy Discord unless actionable.
- Alza sitemap products: raw 3, relevant 0; not useful, keep needs review/paused.
- Cardstore: raw 128 before stricter filter, relevant 31, in-stock 0; category tiles were further tightened.
- Dráčik: raw 436, relevant 0; safe but empty for target products.
- Gengar.cz: raw 92, relevant went from 20 to 8 after stricter filtering; 2 in-stock relevant.
- Hra na netu: raw 20, relevant 0.
- Knihy Dobrovský: raw 115, relevant 12, in-stock relevant 0 in this dry-run; still extracts valid sealed titles and stays routed to `cz-knihy-dobrovsky`.
- Kuma: returned HTTP 429; no bypass attempted.
- Luxor: raw 130, relevant 7, in-stock relevant 0.
- Najáda: raw 117, relevant 27 after stricter filtering, in-stock relevant 2; placeholder `cz-najada` webhook created inactive.
- Pompo: raw 1596, relevant 16, in-stock relevant 16.
- Professor Onyx: raw 40, relevant 5, in-stock relevant 5; placeholder `cz-professor-onyx` webhook created inactive.
- Smarty: raw 135, relevant 41, in-stock relevant 0.
- TCG Karty: raw 198, relevant 1, in-stock relevant 0; many article/info candidates remain unsafe/needs attention.
- Tolarie: raw 0, relevant 0.
- Veselý Drak: raw 65, relevant 38, in-stock relevant 33.

What changed:

- Product Test no longer sends a DEFAULT target from the API and no longer treats product tests as generic target tests.
- Product Test now resolves the product's store-first route, with safe fallback only if no active store webhook exists.
- Target fallback webhook lookup now excludes webhooks assigned to stores, preventing unrelated store-specific webhooks from being used as global DEFAULT fallback.
- Notification logs for product tests now include route context/webhook name without full URL.
- Non-actionable `NEW_PRODUCT` and `SOLD_OUT` alerts are skipped when products are out of stock or have UNKNOWN stock with no price/cart/availability signal; RESTOCK remains actionable.
- Scanner summary diagnostics now include raw/relevant/in-stock counts, skipped counts/reasons, created/updated/unchanged counts, notification sent/skipped/failed counts, and notification skip reasons.
- Seed now creates inactive placeholder store webhook records for CZ presets by webhook name, including `cz-najada`, `cz-professor-onyx`, and `cz-kuma`, without committing real webhook URLs.
- Relevance filter was tightened for single cards and category tiles such as exact `Booster Bundle`, `Booster Balíčky`, `Battle Deck`, `Booster boxy a speciální boxy`, and generic `McDonald's Collection 2024`, while preserving strong sealed patterns like boosters, ETBs, blisters, tins, premium collections, starter decks, and battle decks with real product titles.
- README now documents Product Test store-first routing, out-of-stock/unknown-stock alert suppression, and scan diagnostics.

Intentionally not changed:

- No fetch behavior changes.
- No bypass/evasion/proxy/CAPTCHA behavior.
- No automatic purchasing or checkout automation.
- No real Discord webhook URLs were committed.
- Existing historical noisy data was not deleted.

Test results:

- `npm run prisma:seed` passed locally and created inactive placeholders for missing store webhook names.
- `npm run typecheck` passed.
- `npm test` passed.
- `CI=1 NEXT_TELEMETRY_DISABLED=1 npm run build` passed.
- `git diff --check` passed.

Remaining risk:

- The dry-run preview does not click through every visible product page, so some stores with `UNKNOWN` stock may need source-specific availability selector improvements later.
- Historical products/events/notifications created before these filters remain in the database until ignored manually.
- Najáda and Professor Onyx placeholders are inactive until real URLs are added in Settings.

Next planned step:

- Commit and push this focused routing/noise/diagnostics update to the existing draft PR #17 after one final status review.

Current PR ready to merge:

- Still draft. Core checks pass, but the PR should remain draft until the user retests Product Test routing and scan diagnostics locally.

### 17:38 CEST - Safe JSON-LD ItemList Parser And Source URL Diagnostics

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` / PR #17.

What was inspected:

- Current git status.
- Najáda and Alza Stores, SourceCandidates, ScanJobs, ScanLogs, and recent Products through read-only Prisma inspection.
- `PlaywrightMonitor`, HTML/JSON-LD parser utilities, discovery validation, scan diagnostics, source candidate helpers, and CZ presets.
- Safe read-only Playwright dry-runs against:
  - `https://www.najada.games/pokemon`
  - `https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true`
  - the user-provided Alza filtered hash URL.

Root cause:

- Najáda's filtered public page exposes strong JSON-LD `ItemList -> itemListElement -> item -> Product` data with price, SKU, image, and `schema.org/InStock`, but the parser only read top-level JSON-LD objects.
- The fallback rendered card parser extracted product anchors, but often missed stock/price because those labels live outside the short anchor HTML slice.
- SourceCandidate normalization reused product URL normalization, which strips hash fragments. That is correct for canonical Product URLs, but not for source URLs when client-side filters live in the hash.
- Alza's filtered hash URL returned a Cloudflare/403 human-check page in safe public Playwright validation. No bypass was attempted.

What changed:

- JSON-LD extraction now flattens nested `ItemList`, `itemListElement`, `ListItem`, and `item` nodes so embedded Product entries are parsed.
- `Offer.availability` values such as `https://schema.org/InStock`, `http://schema.org/InStock`, and `InStock` now map to `IN_STOCK`.
- `Offer.priceSpecification.price` and `priceCurrency` are now parsed when direct `Offer.price` is not present.
- Product game context from the source page is applied to JSON-LD products, while non-target games such as Lorcana remain non-target.
- Source URL normalization was separated from Product URL normalization:
  - Product URLs still drop hash fragments.
  - SourceCandidate URLs preserve query params and hash fragments.
- Najáda preset now prefers `https://www.najada.games/pokemon?in_stock=true&in_shop_stock=true` while staying paused by default.
- Sealed relevance now accepts safe context-backed Czech `plechovka` terms and keeps existing blister/tin/mini tin/Poké Ball Tin handling.
- Scan/discovery diagnostics now include page reported count data and warn when the page reports many more products than the parser extracted, indicating pagination, lazy loading, or multiple source candidates may be needed.
- README documents JSON-LD ItemList parsing, SourceCandidate vs Product URL normalization, Najáda's recommended source URL, and Alza's limited/needs-attention status.

Safe dry-run result:

- Before this fix, Najáda filtered dry-run returned roughly `31 raw`, `10 relevant`, `1 in-stock`, with most stock/price values missing.
- After the fix, Najáda filtered dry-run returned `31 raw`, `11 relevant`, `11 in-stock`, `9 priced`, and `pageReportedCount=103`.
- The improvement came from JSON-LD ItemList parsing, not from bypassing or changing network behavior.

Intentionally not changed:

- No DB writes during investigation.
- No Discord sends.
- No Alza bypass, CAPTCHA solving, proxy, evasion, or private endpoint usage.
- No checkout or purchase automation.
- No historical data cleanup.

Test results so far:

- `npm run build -w @tcg-monitor/shared` passed.
- Targeted tests passed:
  - `packages/shared/src/index.test.ts`
  - `packages/shared/src/cz-store-presets.test.ts`
  - `apps/worker/src/monitors/parser-utils.test.ts`
  - `apps/api/src/services/source-candidates.test.ts`
  - `apps/worker/src/services/scanner.test.ts`

Remaining risk:

- Najáda page reports `103` results, while one rendered page currently extracts `31` unique raw products. Multiple active source candidates or pagination support is still needed to cover all visible results.
- Alza remains limited because safe public validation returned HTTP 403/Cloudflare.

Next planned step:

- Run full verification (`typecheck`, `test`, production build, `git diff --check`) and keep PR #17 as draft unless the full suite and manual retest are clean.

Current PR ready to merge:

- Still draft until full verification and local UI retest are complete.

### 21:33 CEST - Full Store Quality Audit And Source Guard Tightening

Work continued from previous unmerged PR: yes, continuing on `daily-autonomous-improvements` / PR #17.

What was inspected:

- Current git status and untracked local backup files.
- Routing, notification, scanner, discovery, source-candidate, parser, and preset code paths.
- Read-only Prisma data for Stores, SourceCandidates, recent Products, ScanJobs, ScanLogs, and NotificationLogs without printing webhook URLs.
- Safe read-only dry-run scans with no DB writes and no Discord sends.

Root cause found:

- Some product detail URLs were still allowed to become scan source candidates. That can crowd out pagination/listing candidates and makes monitoring too narrow.
- Alza category/listing URLs like `/hracky/pokemon-tiny-plechovky/18903052.htm` look numeric enough to pass older product URL heuristics, even though real Alza product details use the `-d123...htm` pattern.
- `inferGame()` treated plain `starter deck` as One Piece, which made non-target Lorcana starter decks look relevant on mixed card-game pages.
- Najáda exposes pagination links with HTML-escaped query params such as `&amp;p=1`; discovery was normalizing the raw attribute value instead of the decoded URL.

What changed:

- Product detail URLs are rejected as SourceCandidate/scan source URLs while remaining valid Product URLs.
- Najáda `/produkt/...`, Knihy `/hra/...`, Alza `...-d123.htm`, and Smarty `...-4p123` are treated as product detail URL patterns, not scan sources.
- Alza numeric category URLs under `/hracky/.../123.htm` are rejected as Product URLs unless they are real `-d123` product detail pages.
- Discovery anchor extraction now decodes HTML entities before URL normalization.
- Discovery now recognizes same-path pagination links (`p`, `page`, `pg`, `strana`) as `PAGINATION_LINK` candidates.
- Discovery no longer creates SourceCandidates from JSON-LD Product detail URLs.
- `starter deck` no longer implies One Piece by itself; title/source must explicitly identify One Piece.
- Pokemon set-name hints such as `Mega Evolution`, `Scarlet/Violet`, `Paldea`, `Surging Sparks`, `White Flare`, `Black Bolt`, etc. are used before broad page context.
- Detectable non-English/non-Japanese localized card products (`German`, `French`, `Italian`, `Spanish`, `Korean`, `Chinese` and Czech equivalents) are skipped by default.
- README now documents that product detail URLs are not safe scan sources and that EN/JP sealed products are preferred.

Safe audit table:

| Store | Tested sources | Raw | Relevant sealed | In-stock relevant | OOS tracked | Skipped | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Alza | `/levne-pokemon-karty`, `/pokemon-booster-boxy-a-specialni-boxy`, `/pokemon-boostery-a-blistery` | 519 | 67 | 2 | 2 | 452 | Working, but many products have unknown stock; hash-filtered URL remains limited if it returns 403/Cloudflare. |
| Alza sitemap products | `_sitemap-live-product-1.xml` | 0 | 0 | 0 | 0 | 0 | Blocked by 403 on linked product fetch; do not bypass. |
| Cardstore | `/pokemon-produkty`, `/one-piece-tcg`, `/japonske-booster-boxy`, `/anglicke-boostery` | 183 | 54 | 0 | 0 | 129 | Limited: relevant sealed products found, but no actionable stock signal. |
| Dráčik | `/pokemon-karticky` | 372 | 0 | 0 | 0 | 372 | Empty/no relevant products after cart/source safety; keep paused. |
| Gengar.cz | `/pokemon`, `/one-piece` | 89 | 7 | 2 | 0 | 82 | Working candidate; keep paused until manual route/source review. |
| Hra na netu | `/kategorie-pokemon` | 20 | 0 | 0 | 0 | 20 | Empty/no relevant products. Historical noisy events are older data. |
| Knihy Dobrovský | `/pokemon-tcg`, `/booster?sort=8`, `/booster` | 155 | 58 | 54 | 0 | 97 | Working; multiple scan sources are useful. |
| Kuma | `/pokemon-karty`, `/boostery` | 0 | 0 | 0 | 0 | 0 | Limited: HTTP 429/timeout; do not bypass. |
| Luxor | `/clanek/727/pokemon-day` | 110 | 7 | 0 | 0 | 103 | Limited: relevant products found, but no actionable stock/price signal. |
| Najáda | filtered Pokemon, broad Pokemon, EN boosters, EN One Piece | 142 | 37 | 31 | 5 | 105 | Working but needs pagination/multiple candidates; page reports far more products than one rendered page exposes. |
| Pompo | `/pokemon-tcg`, `/pokemon`, one product-like stale candidate | 4769 | 37 | 0 | 37 | 4732 | Limited: relevant products are currently out of stock; product-detail source candidates should no longer be promoted. |
| Professor Onyx | `/boostery-2`, `/ostatni-karetni-hry`, `/pokemon-produkty`, `/one-piece` | 217 | 29 | 25 | 0 | 188 | Working after starter-deck/game inference fix. |
| Smarty | Pokemon TCG, One Piece TCG | 87 | 39 | 0 | 0 | 48 | Limited: relevant products found but stock/price/action signal is missing. |
| TCG Karty | `tcg-pokemon`, `tcg-one-piece` | 191 | 0 | 0 | 0 | 191 | Empty/no relevant sealed products; current pages are mostly singles/categories. |
| Tolarie | Pokemon catalog, One Piece catalog | 0 | 0 | 0 | 0 | 0 | Needs feed/API or better public source. |
| Veselý Drak | boosters, One Piece, booster boxes, ETB | 0 | 0 | 0 | 0 | 0 | Limited in this audit: public pages returned 503. Existing stored candidates previously worked; do not bypass. |

Intentionally not changed:

- No DB data was modified during the audit.
- No Discord messages were sent.
- No 403/429/503 bypass, robots bypass, CAPTCHA, proxy, evasion, private endpoint, checkout, or cart automation.
- Did not auto-promote sources during the audit; source changes should remain explicit.

Test results so far:

- `npm run build -w @tcg-monitor/shared` passed.
- Targeted tests passed:
  - `packages/shared/src/index.test.ts`
  - `apps/worker/src/monitors/parser-utils.test.ts`
  - `apps/worker/src/services/discovery.test.ts`
  - `apps/api/src/services/source-candidates.test.ts`
- One earlier targeted workspace command was malformed and failed because npm passed file paths to every workspace relative to the wrong cwd; rerun per-workspace passed.

Remaining risk:

- Full verification still needs to be rerun after these latest edits.
- Najáda needs pagination/multiple active candidate workflow to cover all reported results.
- Several stores are limited by missing stock/action signals, HTTP 429/503, or no useful public source. They should stay paused until manual review or an allowed feed/API is configured.

Next planned step:

- Run full `typecheck`, `npm test`, production build, and `git diff --check`. If clean, commit and push this update to the existing PR #17, still as draft unless the user confirms local UI behavior.

Current PR ready to merge:

- Still draft until full verification completes and the user retests the dashboard/Discord routing locally.
