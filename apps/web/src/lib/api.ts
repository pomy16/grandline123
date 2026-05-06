const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export interface DashboardSummary {
  totalStores: number;
  activeStores: number;
  productsFoundToday: number;
  alertsSentToday: number;
  restocksDetected: number;
  priceDropsDetected: number;
  failedScans: number;
  latestEvents: Array<{
    id: string;
    type: string;
    createdAt: string;
    product: {
      title: string;
      game: string;
      category?: string | null;
      store: { name: string };
    };
  }>;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const payload = await fetchJson<{ data: DashboardSummary }>("/api/dashboard");
    return payload.data;
  } catch {
    return {
      totalStores: 1,
      activeStores: 0,
      productsFoundToday: 0,
      alertsSentToday: 0,
      restocksDetected: 0,
      priceDropsDetected: 0,
      failedScans: 0,
      latestEvents: [
        {
          id: "demo",
          type: "NEW_PRODUCT",
          createdAt: new Date().toISOString(),
          product: { title: "Pokemon TCG Booster Box Demo", game: "POKEMON", category: "Sealed", store: { name: "Demo Mock Store" } }
        }
      ]
    };
  }
}
