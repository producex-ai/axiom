/**
 * PostgreSQL Connection Pool
 *
 * Direct connection to AWS RDS PostgreSQL using node-postgres (pg).
 * Provides a connection pool for efficient database access.
 */

import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

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
      max: 20, // Max connections for handling bulk operations and concurrent requests
      min: 5, // Keep 5 connections warm to match bulk job concurrency
      idleTimeoutMillis: 30000, // 30 seconds - keep connections available longer
      connectionTimeoutMillis: 30000, // 30 seconds - allow time for pool to scale up
      query_timeout: 60000, // 60 seconds for complex queries
      // Connection keep-alive settings for better stability
      keepAlive: true,
      keepAliveInitialDelayMillis: 5000,
      // Important: allow pool to remove broken connections
      allowExitOnIdle: false,
    });

    pool.on("error", (err: Error) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
      // Don't crash the app, pool will recover
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
        console.warn(
          `[Pool] Connection acquired. Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`,
        );
      }
    });

    pool.on("remove", () => {
      if (!pool) return;
      console.log(
        `[Pool] Connection removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`,
      );
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
 * Execute a SQL query with automatic retry on connection errors
 *
 * @param text SQL query text
 * @param params Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();
    try {
      const pool = getPool();
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      };

      if (attempt > 1) {
        console.log(`[Query] Retry attempt ${attempt}/${maxRetries}`);
      }

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
      console.log(
        `Query completed successfully in ${duration}ms, rows:`,
        result.rowCount,
      );
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const pool = getPool();
      lastError = error instanceof Error ? error : new Error(String(error));

      console.error("Query failed:", {
        query: text.substring(0, 100),
        params,
        duration: `${duration}ms`,
        attempt: `${attempt}/${maxRetries}`,
        poolStats: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount,
        },
        error: lastError.message,
      });

      // Check if error is retryable (connection issues)
      const isRetryable =
        lastError.message.includes("Connection terminated") ||
        lastError.message.includes("Connection timeout") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("ETIMEDOUT");

      if (isRetryable && attempt < maxRetries) {
        console.log(
          `[Query] Connection error detected, will retry after brief delay...`,
        );
        // Force reset the pool on connection errors
        await resetPool();
        // Brief delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // Non-retryable error or max retries reached
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Query failed after retries");
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

/**
 * Force reset the pool (for handling connection issues)
 * Use this when connections are timing out or in bad state
 */
export async function resetPool(): Promise<void> {
  console.log("[Pool] Force resetting connection pool...");
  if (pool) {
    try {
      await pool.end();
      console.log("[Pool] Old pool closed successfully");
    } catch (error) {
      console.error("[Pool] Error closing old pool:", error);
    }
    pool = null;
  }
  // Next call to getPool() will create a fresh pool
  console.log("[Pool] Pool reset complete. Next query will create new pool.");
}
