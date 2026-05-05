CREATE TABLE "SourceCandidate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "monitorMode" "MonitorMode" NOT NULL DEFAULT 'HTML',
    "status" TEXT NOT NULL DEFAULT 'CANDIDATE',
    "productsFound" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "discoveredFrom" TEXT,
    "metadata" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SourceCandidate_storeId_url_key" ON "SourceCandidate"("storeId", "url");
CREATE INDEX "SourceCandidate_storeId_status_idx" ON "SourceCandidate"("storeId", "status");
CREATE INDEX "SourceCandidate_monitorMode_idx" ON "SourceCandidate"("monitorMode");

ALTER TABLE "SourceCandidate"
  ADD CONSTRAINT "SourceCandidate_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
