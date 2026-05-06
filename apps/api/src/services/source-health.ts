import type { MonitorMode } from "@prisma/client";
import { normalizeSourceUrl } from "@tcg-monitor/shared";
import { isSafeScanSourceUrl } from "./source-candidates";

type SourceCandidateLike = {
  id: string;
  url: string;
  status: string;
  monitorMode: MonitorMode;
  productsFound: number;
  metadata?: unknown;
  reason?: string | null;
};

type StoreSourceLike = {
  baseUrl: string;
  mode: MonitorMode;
  listingUrls: string[];
};

function metadataNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function metadataArrayLength(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const value = (metadata as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.length : undefined;
}

function sourceKey(url: string, baseUrl: string) {
  try {
    return normalizeSourceUrl(url, baseUrl);
  } catch {
    return url.trim();
  }
}

export function sourceCandidateMetrics(candidate: SourceCandidateLike) {
  const raw =
    metadataNumber(candidate.metadata, "rawProductCandidateCount") ??
    metadataNumber(candidate.metadata, "rawCandidatesCount") ??
    candidate.productsFound;
  const relevant =
    metadataNumber(candidate.metadata, "validatedProductCount") ??
    metadataNumber(candidate.metadata, "relevantProductCount") ??
    candidate.productsFound;
  const skippedNonProducts =
    metadataNumber(candidate.metadata, "skippedNonProducts") ??
    metadataNumber(candidate.metadata, "skippedNonProductCount") ??
    metadataArrayLength(candidate.metadata, "skippedNonProductWarnings") ??
    0;
  const skippedNonTargets = metadataNumber(candidate.metadata, "skippedNonTargetProducts") ?? 0;
  const skipped = skippedNonProducts + skippedNonTargets;
  const skippedRatio = relevant > 0 ? skipped / relevant : skipped > 0 ? Number.POSITIVE_INFINITY : 0;
  return { raw, relevant, skipped, skippedRatio };
}

export function sourceCandidateRecommendation(candidate: SourceCandidateLike, store: StoreSourceLike) {
  const metrics = sourceCandidateMetrics(candidate);
  const safe = isSafeScanSourceUrl(candidate.url, store.baseUrl);
  const modeMatches = candidate.monitorMode === store.mode;
  const isScanSource = store.listingUrls.some((url) => sourceKey(url, store.baseUrl) === sourceKey(candidate.url, store.baseUrl));

  if (!safe) {
    return { status: "UNSAFE", score: -1000, reason: "URL is not safe as a scan source.", ...metrics, safe, modeMatches, isScanSource };
  }
  if (candidate.status === "NEEDS_ATTENTION") {
    return { status: "NEEDS_ATTENTION", score: -100, reason: candidate.reason ?? "Candidate needs review before promotion.", ...metrics, safe, modeMatches, isScanSource };
  }
  if (candidate.status === "EMPTY") {
    return { status: "EMPTY", score: -50, reason: "Source loaded but no relevant sealed TCG products passed validation.", ...metrics, safe, modeMatches, isScanSource };
  }
  if (candidate.status !== "ACTIVE") {
    return { status: "PENDING", score: 0, reason: "Candidate is waiting for validation.", ...metrics, safe, modeMatches, isScanSource };
  }
  if (metrics.relevant <= 0) {
    return { status: "NO_RELEVANT_PRODUCTS", score: -10, reason: "No relevant sealed TCG products passed validation.", ...metrics, safe, modeMatches, isScanSource };
  }

  const noisePenalty = Math.min(metrics.skipped, metrics.relevant * 5);
  const score = metrics.relevant * 20 - noisePenalty + (modeMatches ? 10 : 0) + (isScanSource ? 5 : 0);
  if (metrics.skippedRatio > 5) {
    return { status: "NOISY", score, reason: "Relevant products were found, but skipped noise is high; review before enabling schedules.", ...metrics, safe, modeMatches, isScanSource };
  }
  if (metrics.relevant >= 5 && metrics.skippedRatio <= 3) {
    return { status: "RECOMMENDED", score, reason: "Good target: relevant sealed TCG products found with acceptable noise.", ...metrics, safe, modeMatches, isScanSource };
  }
  return { status: "TESTABLE", score, reason: "Relevant sealed TCG products found; run a validation scan before enabling schedules.", ...metrics, safe, modeMatches, isScanSource };
}

export function enrichSourceCandidates<T extends SourceCandidateLike>(candidates: T[], store: StoreSourceLike) {
  return candidates.map((candidate) => ({
    ...candidate,
    recommendation: sourceCandidateRecommendation(candidate, store)
  }));
}

export function bestSourceCandidate<T extends SourceCandidateLike>(candidates: T[], store: StoreSourceLike) {
  return enrichSourceCandidates(candidates, store)
    .filter((candidate) => ["RECOMMENDED", "TESTABLE", "NOISY"].includes(candidate.recommendation.status))
    .sort((first, second) => second.recommendation.score - first.recommendation.score)[0] ?? null;
}

export function sourceHealthSummary(candidates: SourceCandidateLike[], store: StoreSourceLike) {
  const enriched = enrichSourceCandidates(candidates, store);
  const best = bestSourceCandidate(candidates, store);
  const totals = enriched.reduce(
    (summary, candidate) => {
      summary.raw += candidate.recommendation.raw;
      summary.relevant += candidate.recommendation.relevant;
      summary.skipped += candidate.recommendation.skipped;
      if (candidate.status === "ACTIVE") summary.targetFound += 1;
      if (candidate.status === "NEEDS_ATTENTION") summary.needsAttention += 1;
      if (candidate.status === "EMPTY") summary.empty += 1;
      if (candidate.recommendation.status === "RECOMMENDED") summary.recommended += 1;
      if (candidate.recommendation.status === "TESTABLE") summary.testable += 1;
      if (candidate.recommendation.status === "NOISY") summary.noisy += 1;
      if (candidate.recommendation.status === "UNSAFE") summary.unsafe += 1;
      return summary;
    },
    { raw: 0, relevant: 0, skipped: 0, targetFound: 0, needsAttention: 0, empty: 0, recommended: 0, testable: 0, noisy: 0, unsafe: 0 }
  );

  return {
    ...totals,
    totalCandidates: candidates.length,
    scanSourceCount: store.listingUrls.length,
    primarySourceUrl: store.listingUrls[0] ?? null,
    bestCandidateId: best?.id ?? null,
    bestCandidateUrl: best?.url ?? null,
    bestStatus: best?.recommendation.status ?? null,
    bestScore: best?.recommendation.score ?? null,
    bestReason: best?.recommendation.reason ?? "No validated safe source candidate is available yet."
  };
}
