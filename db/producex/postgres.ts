import { Pool, type QueryResult, type QueryResultRow } from 'pg';

const connectionString = process.env.PRODUCEX_DB_URL;

if (!connectionString) {
  console.warn('PRODUCEX_DB_URL is not defined');
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// biome-ignore lint/suspicious/noExplicitAny: Generic query wrapper needs any for flexibility
export async function query<T extends QueryResultRow = any>(
  text: string,
  // biome-ignore lint/suspicious/noExplicitAny: PG params can be any type
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export async function getClient() {
  return getPool().connect();
}
