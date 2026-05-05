ALTER TYPE "WebhookTarget" ADD VALUE IF NOT EXISTS 'TEST';
ALTER TYPE "WebhookTarget" ADD VALUE IF NOT EXISTS 'RESTOCK';
ALTER TYPE "WebhookTarget" ADD VALUE IF NOT EXISTS 'PRICE_DROP';
ALTER TYPE "WebhookTarget" ADD VALUE IF NOT EXISTS 'PREORDER';

ALTER TABLE "Store" ADD COLUMN "discordWebhookId" TEXT;

CREATE INDEX "Store_discordWebhookId_idx" ON "Store"("discordWebhookId");

ALTER TABLE "Store"
  ADD CONSTRAINT "Store_discordWebhookId_fkey"
  FOREIGN KEY ("discordWebhookId")
  REFERENCES "DiscordWebhook"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
