const encoder = new TextEncoder();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function getKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(secret) {
  const issuedAt = Date.now().toString();
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(issuedAt));
  return `${issuedAt}.${toHex(sig)}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !secret) return false;
  const [issuedAt, sigHex] = token.split(".");
  if (!issuedAt || !sigHex) return false;

  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0 || age > THIRTY_DAYS_MS) return false;

  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(issuedAt));
  const expectedHex = toHex(sig);

  if (expectedHex.length !== sigHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ sigHex.charCodeAt(i);
  }
  return diff === 0;
}
