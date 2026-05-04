import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function demoHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
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
    ["seed-default-webhook", "Default placeholder webhook", "DEFAULT", process.env.DISCORD_DEFAULT_WEBHOOK_URL ?? "https://discord.com/api/webhooks/replace/default"],
    ["seed-pokemon-webhook", "Pokemon placeholder webhook", "POKEMON", process.env.DISCORD_POKEMON_WEBHOOK_URL || "https://discord.com/api/webhooks/replace/pokemon"],
    ["seed-one-piece-webhook", "One Piece placeholder webhook", "ONE_PIECE", process.env.DISCORD_ONE_PIECE_WEBHOOK_URL || "https://discord.com/api/webhooks/replace/one-piece"],
    ["seed-error-webhook", "Error log placeholder webhook", "ERROR_LOG", process.env.DISCORD_ERROR_WEBHOOK_URL || "https://discord.com/api/webhooks/replace/error"]
  ] as const;

  for (const [id, name, target, url] of webhooks) {
    await prisma.discordWebhook.upsert({
      where: { id },
      update: { name, target, active: false },
      create: { id, name, target, url, active: false }
    });
  }
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
  const mockStore = await prisma.store.upsert({
    where: { id: "seed-mock-store" },
    update: {
      name: "Demo Mock Store",
      active: false,
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
      notes: "Disabled demo store using mocked monitor data."
    }
  });

  const watchStore = await prisma.store.upsert({
    where: { id: "seed-watch-store" },
    update: {
      name: "Demo Watch Store",
      active: false,
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
