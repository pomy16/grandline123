import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash: hashPassword(adminPassword)
    }
  });

  await prisma.discordWebhook.upsert({
    where: { id: "seed-default-webhook" },
    update: {},
    create: {
      id: "seed-default-webhook",
      name: "Default placeholder webhook",
      target: "DEFAULT",
      url: process.env.DISCORD_DEFAULT_WEBHOOK_URL ?? "https://discord.com/api/webhooks/replace/default",
      active: false
    }
  });

  await prisma.keywordRule.upsert({
    where: { id: "seed-rule-pokemon-sealed" },
    update: {},
    create: {
      id: "seed-rule-pokemon-sealed",
        name: "Pokemon sealed products",
        includeKeywords: ["pokemon", "pokémon", "pokemon tcg", "booster box", "elite trainer box", "etb", "display", "blister"],
        excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
        category: "Sealed",
        game: "POKEMON",
        priority: "HIGH",
        webhookTarget: "POKEMON"
    }
  });

  await prisma.keywordRule.upsert({
    where: { id: "seed-rule-one-piece-sealed" },
    update: {},
    create: {
      id: "seed-rule-one-piece-sealed",
        name: "One Piece sealed products",
        includeKeywords: ["one piece card game", "op booster", "starter deck", "romance dawn", "paramount war", "awakening of the new era"],
        excludeKeywords: ["used", "damaged", "digital", "proxy", "fake", "custom", "sleeve only", "empty box", "opened", "resealed"],
        category: "Sealed",
        game: "ONE_PIECE",
        priority: "HIGH",
        webhookTarget: "ONE_PIECE"
    }
  });

  const store = await prisma.store.upsert({
    where: { id: "seed-mock-store" },
    update: {},
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

  const product = await prisma.product.upsert({
    where: {
      storeId_canonicalUrl: {
        storeId: store.id,
        canonicalUrl: "https://example.invalid/products/pokemon-booster-box"
      }
    },
    update: {},
    create: {
      storeId: store.id,
      title: "Pokemon TCG Booster Box Demo",
      normalizedTitle: "pokemon tcg booster box demo",
      url: "https://example.invalid/products/pokemon-booster-box",
      canonicalUrl: "https://example.invalid/products/pokemon-booster-box",
      imageUrl: "https://placehold.co/400x400?text=Pokemon+TCG",
      price: "129.99",
      currency: "EUR",
      stockStatus: "IN_STOCK",
      isAvailable: true,
      isPreorder: false,
      sku: "DEMO-PKM-BOX",
      category: "Sealed",
      game: "POKEMON",
      lastNotifiedHash: createHash("sha256").update("seed").digest("hex")
    }
  });

  await prisma.productEvent.upsert({
    where: { id: "seed-event-demo-new-product" },
    update: {},
    create: {
      id: "seed-event-demo-new-product",
      productId: product.id,
      type: "NEW_PRODUCT",
      newValue: { title: product.title, price: "129.99", stockStatus: "IN_STOCK" },
      notificationSent: false
    }
  });

  await prisma.appSetting.createMany({
    skipDuplicates: true,
    data: [
      { key: "defaultPollingIntervalSeconds", value: 300 },
      { key: "notificationCooldownSeconds", value: 900 },
      { key: "logRetentionDays", value: 30 },
      { key: "safetyMode", value: { automaticCheckout: false, bypassProtections: false } }
    ]
  });
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
