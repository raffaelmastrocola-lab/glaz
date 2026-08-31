import { Redis } from "@upstash/redis";

const CREDENTIAL_PAIRS = [
  ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["REDIS_REST_URL", "REDIS_REST_TOKEN"],
];

function resolveCredentials() {
  for (const [urlKey, tokenKey] of CREDENTIAL_PAIRS) {
    const url = process.env[urlKey];
    const token = process.env[tokenKey];
    if (url && token) return { url, token };
  }
  return null;
}

let client = null;

export function getRedis() {
  if (client) return client;
  const creds = resolveCredentials();
  if (!creds) {
    throw new Error(
      "Nenhuma credencial Redis encontrada. No projeto na Vercel, adicione a integração " +
      "'Upstash for Redis' na aba Storage e faça um novo deploy."
    );
  }
  client = new Redis({ url: creds.url, token: creds.token });
  return client;
}
