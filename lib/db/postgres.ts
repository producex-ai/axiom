/**
 * PostgreSQL Connection Pool
 *
 * Direct connection to AWS RDS PostgreSQL using node-postgres (pg).
 * Provides a connection pool for efficient database access.
 */

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

// Singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    // Validate required environment variables
    if (!process.env.DB_HOST) {
      throw new Error("DB_HOST environment variable is required");
    }
    if (!process.env.DB_NAME) {
      throw new Error("DB_NAME environment variable is required");
    }
    if (!process.env.DB_USER) {
      throw new Error("DB_USER environment variable is required");
    }
    if (!process.env.DB_PASSWORD) {
      throw new Error("DB_PASSWORD environment variable is required");
    }

    console.log("Creating PostgreSQL connection pool:", {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      ssl: process.env.DB_SSL === "true",
    });

    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      // AWS RDS requires SSL, use proper SSL configuration
      ssl: {
        rejectUnauthorized: false, // For development; in production, use proper CA certificate
      },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // 30 seconds - keep idle connections for reuse
      connectionTimeoutMillis: 20000, // Increased to 20 seconds for intermittent network issues
      query_timeout: 30000, // Increased to 30 seconds for complex queries
      // Connection keep-alive settings for better stability
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on("error", (err: Error) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });

    pool.on("connect", () => {
      console.log("PostgreSQL client connected successfully");
    });

    // Monitor connection pool health
    pool.on("acquire", () => {
      if (!pool) return;
      const totalCount = pool.totalCount;
      const idleCount = pool.idleCount;
      const waitingCount = pool.waitingCount;
      if (waitingCount > 0) {
        console.warn(`[Pool] Connection acquired. Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
      }
    });

    pool.on("remove", () => {
      if (!pool) return;
      console.log(`[Pool] Connection removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`);
    });

    // Test connection immediately
    pool
      .query("SELECT 1")
      .then(() => {
        console.log("PostgreSQL pool initialized and tested successfully");
      })
      .catch((err: Error) => {
        console.error("Failed to test PostgreSQL connection:", err);
      });
  }

  return pool;
}

/**
 * Execute a SQL query
 *
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const startTime = Date.now();
  try {
    const pool = getPool();
    const poolStats = {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
    
    console.log(
      "Executing query:",
      text.substring(0, 100),
      "with params:",
      params,
      "Pool stats:",
      poolStats,
    );
    
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - startTime;
    console.log(`Query completed successfully in ${duration}ms, rows:`, result.rowCount);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const pool = getPool();
    console.error("Query failed:", {
      query: text.substring(0, 100),
      params,
      duration: `${duration}ms`,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 * Remember to call client.release() when done
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Close the pool (for cleanup, e.g., in tests)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
