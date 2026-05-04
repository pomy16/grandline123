import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const existing = Buffer.from(hash, "hex");
  return existing.length === candidate.length && timingSafeEqual(existing, candidate);
}

export function signSession(payload: { userId: string; email: string }, secret: string): string {
  const encoded = Buffer.from(JSON.stringify({ ...payload, issuedAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifySession(token: string, secret: string, ttlSeconds = 24 * 60 * 60): { userId: string; email: string } | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!safeEqual(expected, signature)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { userId: string; email: string; issuedAt?: number };
    if (!decoded.userId || !decoded.email || !decoded.issuedAt) return null;
    if (Date.now() - decoded.issuedAt > ttlSeconds * 1000) return null;
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}
