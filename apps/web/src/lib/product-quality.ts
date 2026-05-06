import { isRelevantTargetProduct, normalizeTitle } from "@tcg-monitor/shared";

export type ProductQualityInput = {
  title: string;
  game: string;
  category?: string | null;
};

export function wouldSkipProductNow(product: ProductQualityInput) {
  return !isRelevantTargetProduct({
    title: product.title,
    normalizedTitle: normalizeTitle(product.title),
    game: product.game as never,
    category: product.category
  });
}
