export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function formatDuration(ms?: number | null) {
  if (ms === null || ms === undefined) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function formatMoney(value?: string | number | null, currency?: string | null) {
  if (value === null || value === undefined || value === "") return "-";
  return `${value} ${currency ?? ""}`.trim();
}

export function truncateMiddle(value: string, maxLength = 76) {
  if (value.length <= maxLength) return value;
  const keep = Math.floor((maxLength - 3) / 2);
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

