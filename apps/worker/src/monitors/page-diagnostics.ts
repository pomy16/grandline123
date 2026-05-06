import type { NormalizedProduct } from "@tcg-monitor/shared";

type ProductRawData = {
  pageUrl?: unknown;
  pageReportedCount?: unknown;
};

function productRawData(product: NormalizedProduct): ProductRawData {
  return typeof product.rawData === "object" && product.rawData !== null ? (product.rawData as ProductRawData) : {};
}

export function pageExtractionDiagnostics(products: NormalizedProduct[]) {
  const pages = new Map<string, { pageUrl: string; pageReportedCount: number | null; rawExtractedCount: number }>();

  for (const product of products) {
    const rawData = productRawData(product);
    const pageUrl = typeof rawData.pageUrl === "string" ? rawData.pageUrl : "unknown";
    const pageReportedCount = typeof rawData.pageReportedCount === "number" && Number.isFinite(rawData.pageReportedCount) ? rawData.pageReportedCount : null;
    const existing = pages.get(pageUrl) ?? { pageUrl, pageReportedCount, rawExtractedCount: 0 };
    existing.rawExtractedCount += 1;
    if (existing.pageReportedCount === null && pageReportedCount !== null) existing.pageReportedCount = pageReportedCount;
    pages.set(pageUrl, existing);
  }

  const pageReportedCounts = Array.from(pages.values()).filter((page) => page.pageReportedCount !== null);
  const pageExtractionWarnings = pageReportedCounts
    .filter((page) => page.pageReportedCount !== null && page.pageReportedCount > Math.max(page.rawExtractedCount * 2, page.rawExtractedCount + 10))
    .map((page) => ({
      pageUrl: page.pageUrl,
      pageReportedCount: page.pageReportedCount,
      rawExtractedCount: page.rawExtractedCount,
      note: "source likely paginated or parser sees only current page"
    }));

  return { pageReportedCounts, pageExtractionWarnings };
}
