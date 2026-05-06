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
