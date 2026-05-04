import type { NormalizedProduct } from "@tcg-monitor/shared";
import type { Store } from "@prisma/client";

export function isMockProductOutput(product: NormalizedProduct) {
  const rawData = product.rawData;
  return typeof rawData === "object" && rawData !== null && "source" in rawData && rawData.source === "mock-monitor";
}

export function assertNoMockProductsForRealStore(store: Pick<Store, "mode">, products: NormalizedProduct[]) {
  if (store.mode === "MOCK") return;

  const mockProduct = products.find(isMockProductOutput);
  if (mockProduct) {
    throw new Error(`Safety violation: ${store.mode} store received mock product output (${mockProduct.title}).`);
  }
}
