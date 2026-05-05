import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { CZ_STORE_PRESETS, buildStorePresetNotes, resolvePresetWebhookId } from "../packages/shared/src/cz-store-presets";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function demoHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function placeholderWebhookUrl(name: string) {
  return `https://example.invalid/discord-webhook-placeholder/${name}`;
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { name: "Demo Admin" },
    create: {
      email: adminEmail,
      name: "Demo Admin",
      passwordHash: hashPassword(adminPassword)
    }
  });
}

async function seedWebhooks() {
  const webhooks = [
    ["seed-default-webhook", "Default placeholder webhook", "DEFAULT", process.env.DISCORD_DEFAULT_WEBHOOK_URL ?? placeholderWebhookUrl("default")],
    ["seed-pokemon-webhook", "pokemon-alerty", "POKEMON", process.env.DISCORD_POKEMON_WEBHOOK_URL || placeholderWebhookUrl("pokemon-alerty")],
    ["seed-one-piece-webhook", "one-piece-alerty", "ONE_PIECE", process.env.DISCORD_ONE_PIECE_WEBHOOK_URL || placeholderWebhookUrl("one-piece-alerty")],
    ["seed-high-priority-webhook", "high-priority", "HIGH_PRIORITY", process.env.DISCORD_HIGH_PRIORITY_WEBHOOK_URL || placeholderWebhookUrl("high-priority")],
    ["seed-error-webhook", "bot-errors", "ERROR_LOG", process.env.DISCORD_ERROR_WEBHOOK_URL || placeholderWebhookUrl("bot-errors")],
    ["seed-test-webhook", "test-alerty", "TEST", process.env.DISCORD_TEST_WEBHOOK_URL || placeholderWebhookUrl("test-alerty")],
    ["seed-restock-webhook", "RESTOCK events", "RESTOCK", process.env.DISCORD_RESTOCK_WEBHOOK_URL || placeholderWebhookUrl("restock")],
    ["seed-price-drop-webhook", "PRICE_DROP events", "PRICE_DROP", process.env.DISCORD_PRICE_DROP_WEBHOOK_URL || placeholderWebhookUrl("price-drop")],
    ["seed-preorder-webhook", "PREORDER events", "PREORDER", process.env.DISCORD_PREORDER_WEBHOOK_URL || placeholderWebhookUrl("preorder")]
  ] as const;

  for (const [id, name, target, url] of webhooks) {
    const existingByName = await prisma.discordWebhook.findFirst({ where: { name }, orderBy: { updatedAt: "desc" } });
    if (existingByName) {
      await prisma.discordWebhook.update({
        where: { id: existingByName.id },
        data: { target, active: existingByName.active }
      });
      continue;
    }

    await prisma.discordWebhook.upsert({
      where: { id },
      update: { name, target, active: false },
      create: { id, name, target, url, active: false }
    });
  }
}

async function webhookIdsByName(names: string[]) {
  const webhooks = await prisma.discordWebhook.findMany({
    where: { name: { in: names } },
    orderBy: [{ active: "desc" }, { updatedAt: "desc" }]
  });
  const ids = new Map<string, string>();
  for (const webhook of webhooks) {
    if (!ids.has(webhook.name)) ids.set(webhook.name, webhook.id);
  }
  return ids;
}

async function seedRules() {
  await prisma.keywordRule.upsert({
    where: { id: "seed-rule-pokemon-sealed" },
    update: {
      includeKeywords: ["pokemon", "pokémon", "pokemon tcg", "booster box", "elite trainer box", "etb", "display", "blister"],
      excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
      priority: "HIGH",
      webhookTarget: "POKEMON",
      cooldownSeconds: 900,
      active: true
    },
    create: {
      id: "seed-rule-pokemon-sealed",
      name: "Pokemon sealed products",
      includeKeywords: ["pokemon", "pokémon", "pokemon tcg", "booster box", "elite trainer box", "etb", "display", "blister"],
      excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
      category: "Sealed",
      game: "POKEMON",
      priority: "HIGH",
      webhookTarget: "POKEMON",
      cooldownSeconds: 900
    }
  });

  await prisma.keywordRule.upsert({
    where: { id: "seed-rule-one-piece-sealed" },
    update: {
      includeKeywords: ["one piece card game", "op booster", "starter deck", "romance dawn", "paramount war", "awakening of the new era"],
      excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
      priority: "HIGH",
      webhookTarget: "ONE_PIECE",
      cooldownSeconds: 900,
      active: true
    },
    create: {
      id: "seed-rule-one-piece-sealed",
      name: "One Piece sealed products",
      includeKeywords: ["one piece card game", "op booster", "starter deck", "romance dawn", "paramount war", "awakening of the new era"],
      excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
      category: "Sealed",
      game: "ONE_PIECE",
      priority: "HIGH",
      webhookTarget: "ONE_PIECE",
      cooldownSeconds: 900
    }
  });

  await prisma.keywordRule.upsert({
    where: { id: "seed-rule-price-drop" },
    update: { active: true, priority: "CRITICAL", webhookTarget: "HIGH_PRIORITY" },
    create: {
      id: "seed-rule-price-drop",
      name: "High priority sealed discounts",
      includeKeywords: ["booster", "display", "elite trainer box", "starter deck"],
      excludeKeywords: ["used", "damaged", "opened", "resealed"],
      category: "Sealed",
      game: "BOTH",
      maxPrice: "100.00",
      priority: "CRITICAL",
      webhookTarget: "HIGH_PRIORITY",
      cooldownSeconds: 600
    }
  });
}

async function seedDemoData() {
  const demoWatchWebhookId = resolvePresetWebhookId({ webhookName: "cz-alza" }, await webhookIdsByName(["cz-alza"]));
  const mockStore = await prisma.store.upsert({
    where: { id: "seed-mock-store" },
    update: {
      name: "Demo Mock Store",
      active: false,
      discordWebhookId: "seed-test-webhook",
      lastError: null,
      repeatedFailureCount: 0,
      autoPausedAfterFailures: false
    },
    create: {
      id: "seed-mock-store",
      name: "Demo Mock Store",
      baseUrl: "https://example.invalid",
      listingUrls: ["https://example.invalid/products"],
      mode: "MOCK",
      pollingIntervalSeconds: 300,
      currency: "EUR",
      country: "CZ",
      language: "en",
      active: false,
      discordWebhookId: "seed-test-webhook",
      notes: "Disabled demo store using mocked monitor data."
    }
  });

  const watchStore = await prisma.store.upsert({
    where: { id: "seed-watch-store" },
    update: {
      name: "Demo Watch Store",
      active: false,
      discordWebhookId: demoWatchWebhookId,
      lastError: "Demo HTML selector mismatch: price selector returned no value.",
      repeatedFailureCount: 2
    },
    create: {
      id: "seed-watch-store",
      name: "Demo Watch Store",
      baseUrl: "https://example.invalid",
      listingUrls: ["https://example.invalid/pokemon", "https://example.invalid/one-piece"],
      mode: "HTML",
      pollingIntervalSeconds: 600,
      currency: "EUR",
      country: "CZ",
      language: "en",
      active: false,
      trusted: true,
      discordWebhookId: demoWatchWebhookId,
      selectorProductUrl: ".product-card a",
      selectorTitle: ".product-title",
      selectorPrice: ".price",
      selectorStockStatus: ".stock",
      lastError: "Demo HTML selector mismatch: price selector returned no value.",
      repeatedFailureCount: 2,
      notes: "Demo real-mode store intentionally disabled. Use it to inspect error states without scanning external sites."
    }
  });

  const pokemon = await prisma.product.upsert({
    where: { storeId_canonicalUrl: { storeId: mockStore.id, canonicalUrl: "https://example.invalid/products/pokemon-booster-box" } },
    update: { price: "119.99", previousPrice: "139.99", stockStatus: "IN_STOCK", isAvailable: true, game: "POKEMON" },
    create: {
      storeId: mockStore.id,
      title: "Pokemon TCG Scarlet & Violet Booster Box Demo",
      normalizedTitle: "pokemon tcg scarlet violet booster box demo",
      url: "https://example.invalid/products/pokemon-booster-box",
      canonicalUrl: "https://example.invalid/products/pokemon-booster-box",
      imageUrl: "https://placehold.co/400x400?text=Pokemon+TCG",
      price: "119.99",
      previousPrice: "139.99",
      currency: "EUR",
      stockStatus: "IN_STOCK",
      isAvailable: true,
      isPreorder: false,
      sku: "DEMO-PKM-BOX",
      category: "Sealed",
      game: "POKEMON",
      lastNotifiedHash: demoHash("seed-pokemon")
    }
  });

  const onePiece = await prisma.product.upsert({
    where: { storeId_canonicalUrl: { storeId: mockStore.id, canonicalUrl: "https://example.invalid/products/one-piece-starter-deck" } },
    update: { price: "14.99", stockStatus: "PREORDER", isAvailable: true, isPreorder: true, game: "ONE_PIECE" },
    create: {
      storeId: mockStore.id,
      title: "One Piece Card Game Starter Deck Demo",
      normalizedTitle: "one piece card game starter deck demo",
      url: "https://example.invalid/products/one-piece-starter-deck",
      canonicalUrl: "https://example.invalid/products/one-piece-starter-deck",
      imageUrl: "https://placehold.co/400x400?text=One+Piece",
      price: "14.99",
      currency: "EUR",
      stockStatus: "PREORDER",
      isAvailable: true,
      isPreorder: true,
      sku: "DEMO-OP-ST",
      category: "Sealed",
      game: "ONE_PIECE"
    }
  });

  await prisma.productEvent.upsert({
    where: { id: "seed-event-demo-price-drop" },
    update: {},
    create: {
      id: "seed-event-demo-price-drop",
      productId: pokemon.id,
      type: "PRICE_DROP",
      oldValue: { title: pokemon.title, price: "139.99", stockStatus: "IN_STOCK" },
      newValue: { title: pokemon.title, price: "119.99", stockStatus: "IN_STOCK" },
      notificationSent: true,
      metadata: { stateHash: demoHash("seed-price-drop"), matchedKeywordRuleName: "High priority sealed discounts" }
    }
  });

  await prisma.productEvent.upsert({
    where: { id: "seed-event-demo-preorder" },
    update: {},
    create: {
      id: "seed-event-demo-preorder",
      productId: onePiece.id,
      type: "PREORDER_OPENED",
      newValue: { title: onePiece.title, price: "14.99", stockStatus: "PREORDER" },
      notificationSent: false,
      metadata: { stateHash: demoHash("seed-preorder"), matchedKeywordRuleName: "One Piece sealed products" }
    }
  });

  await prisma.scanJob.upsert({
    where: { id: "seed-scan-job-success" },
    update: {},
    create: {
      id: "seed-scan-job-success",
      storeId: mockStore.id,
      status: "SUCCEEDED",
      startedAt: new Date(Date.now() - 60_000),
      finishedAt: new Date(Date.now() - 58_000),
      durationMs: 2_000,
      productsFound: 2,
      eventsCreated: 2,
      metadata: { scenario: "demo-success" }
    }
  });

  await prisma.scanLog.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-log-success",
        storeId: mockStore.id,
        severity: "INFO",
        message: "Demo scan completed for Demo Mock Store.",
        context: { productsFound: 2, eventsCreated: 2, fallbackUsed: false }
      },
      {
        id: "seed-log-selector-warning",
        storeId: watchStore.id,
        severity: "WARN",
        message: "Demo selector warning for Demo Watch Store.",
        context: { selector: ".price", advice: "Review public HTML selector before activating this store." }
      }
    ]
  });

  await prisma.notificationLog.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-notification-price-drop",
        productId: pokemon.id,
        eventId: "seed-event-demo-price-drop",
        target: "POKEMON",
        status: "SKIPPED",
        payloadHash: demoHash("seed-notification-price-drop"),
        error: "No active Discord webhook configured for demo target."
      }
    ]
  });
}

async function seedCzechStorePresets() {
  const webhookIds = await webhookIdsByName([...new Set(CZ_STORE_PRESETS.map((preset) => preset.webhookName))]);

  for (const preset of CZ_STORE_PRESETS) {
    const discordWebhookId = resolvePresetWebhookId(preset, webhookIds);
    const notes = buildStorePresetNotes(preset, Boolean(discordWebhookId));
    const data = {
      name: preset.name,
      baseUrl: preset.baseUrl,
      listingUrls: preset.listingUrls,
      apiEndpoint: null,
      mode: preset.mode,
      pollingIntervalSeconds: preset.pollingIntervalSeconds,
      currency: preset.currency,
      country: preset.country,
      language: preset.language,
      trusted: preset.trusted,
      discordWebhookId,
      notes
    };

    const store = await prisma.store.upsert({
      where: { id: preset.id },
      update: data,
      create: {
        id: preset.id,
        ...data,
        active: false
      }
    });

    for (const listingUrl of preset.listingUrls) {
      await prisma.sourceCandidate.upsert({
        where: { storeId_url: { storeId: store.id, url: listingUrl } },
        update: {
          kind: "PRESET_LISTING",
          monitorMode: preset.mode,
          status: preset.recommended ? "ACTIVE" : "CANDIDATE",
          reason: preset.recommended ? "Preset source is currently marked working/recommended." : "Seeded preset source; run Discovery scan to validate locally.",
          discoveredFrom: "prisma.seed",
          productsFound: 0
        },
        create: {
          storeId: store.id,
          url: listingUrl,
          kind: "PRESET_LISTING",
          monitorMode: preset.mode,
          status: preset.recommended ? "ACTIVE" : "CANDIDATE",
          reason: preset.recommended ? "Preset source is currently marked working/recommended." : "Seeded preset source; run Discovery scan to validate locally.",
          discoveredFrom: "prisma.seed",
          productsFound: 0
        }
      });
    }
  }
}

async function seedSettings() {
  await prisma.appSetting.createMany({
    skipDuplicates: true,
    data: [
      { key: "defaultPollingIntervalSeconds", value: Number(process.env.DEFAULT_POLLING_INTERVAL_SECONDS ?? 300) },
      { key: "notificationCooldownSeconds", value: Number(process.env.NOTIFICATION_COOLDOWN_SECONDS ?? 900) },
      { key: "logRetentionDays", value: Number(process.env.LOG_RETENTION_DAYS ?? 30) },
      { key: "safetyMode", value: { automaticCheckout: false, bypassProtections: false, proxyRotation: false } }
    ]
  });
}

async function main() {
  await seedAdmin();
  await seedWebhooks();
  await seedRules();
  await seedDemoData();
  await seedCzechStorePresets();
  await seedSettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
