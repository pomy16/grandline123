import { normalizeUrl } from "@tcg-monitor/shared";

function normalizePathForSafety(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sourceKey(url: string, baseUrl: string) {
  try {
    return normalizeUrl(url, baseUrl);
  } catch {
    return url.trim();
  }
}

export function isSafeScanSourceUrl(url: string, baseUrl: string) {
  try {
    const parsed = new URL(url, baseUrl);
    const base = new URL(baseUrl);
    const path = normalizePathForSafety(parsed.pathname).replace(/\/+$/, "");
    const segments = path.split("/").filter(Boolean);
    const searchPath = normalizePathForSafety(`${parsed.pathname}?${parsed.searchParams.toString()}`);
    if (parsed.origin !== base.origin) return false;
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (segments.length === 0) return false;
    if (/basket|cart|checkout|order|payment|objednavka|kosik|platba|addtocart|add-to-cart|add_to_cart|pridat-do-kosiku|vlozit-do-kosiku|pokladna/.test(searchPath)) return false;
    if (/\/(?:blog|clanek|clanky|clanky-videa|clanky_videa|article|articles|magazin|navod|guide|poradna)(?:\/|$)/.test(`${path}/`)) return false;
    if (/(^|\/)(jak-|proc-|ochrana-|osobni-udaje|obchodni-podminky|cookie|kontakt|o-nas|reklamace|doprava|platba|spustili-jsme)/.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

export function dedupeSourceUrls(urls: string[], baseUrl: string) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    const key = sourceKey(url, baseUrl);
    if (!key || seen.has(key) || !isSafeScanSourceUrl(key, baseUrl)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function addScanSourceUrl(existingUrls: string[], candidateUrl: string, baseUrl: string) {
  if (!isSafeScanSourceUrl(candidateUrl, baseUrl)) {
    throw new Error("Candidate URL is not safe as a scan source.");
  }
  return dedupeSourceUrls([...existingUrls, candidateUrl], baseUrl);
}

export function promotePrimarySourceUrl(existingUrls: string[], candidateUrl: string, baseUrl: string) {
  const promoted = sourceKey(candidateUrl, baseUrl);
  if (!isSafeScanSourceUrl(promoted, baseUrl)) {
    throw new Error("Candidate URL is not safe as a scan source.");
  }
  return dedupeSourceUrls([promoted, ...existingUrls.filter((url) => sourceKey(url, baseUrl) !== promoted)], baseUrl);
}

export function removeScanSourceUrl(existingUrls: string[], candidateUrl: string, baseUrl: string) {
  const removed = sourceKey(candidateUrl, baseUrl);
  const nextUrls = dedupeSourceUrls(existingUrls, baseUrl).filter((url) => sourceKey(url, baseUrl) !== removed);
  if (nextUrls.length === 0) {
    throw new Error("A store must keep at least one scan source URL.");
  }
  return nextUrls;
}
