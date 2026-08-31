import postgres from "postgres";

const CONNECTION_KEYS = ["POSTGRES_URL", "DATABASE_URL", "POSTGRES_PRISMA_URL"];

function resolveConnectionString() {
  for (const key of CONNECTION_KEYS) {
    if (process.env[key]) return process.env[key];
  }
  return null;
}

let client = null;
let tableReady = null;

function getClient() {
  if (client) return client;
  const connectionString = resolveConnectionString();
  if (!connectionString) {
    throw new Error(
      "Nenhuma credencial de banco encontrada. No projeto na Vercel, conecte um banco " +
      "(Supabase ou outro Postgres) na aba Storage e faça um novo deploy."
    );
  }
  // prepare:false — obrigatório com o pooler do Supabase em modo transaction (porta 6543),
  // que não suporta prepared statements entre conexões.
  client = postgres(connectionString, { ssl: "require", prepare: false });
  return client;
}

async function ensureTable() {
  if (!tableReady) {
    const sql = getClient();
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS glaz_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }
  await tableReady;
}

export async function getState() {
  const sql = getClient();
  await ensureTable();
  const rows = await sql`SELECT value FROM glaz_state WHERE key = 'board'`;
  if (!rows.length) return null;
  const value = rows[0].value;
  return typeof value === "string" ? JSON.parse(value) : value;
}

export async function setState(value) {
  const sql = getClient();
  await ensureTable();
  const json = JSON.stringify(value);
  await sql`
    INSERT INTO glaz_state (key, value, updated_at)
    VALUES ('board', ${json}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = ${json}::jsonb, updated_at = now()
  `;
}
