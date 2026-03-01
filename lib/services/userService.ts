import { clerkClient } from "@clerk/nextjs/server";

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch user with retry logic for rate limits
 */
async function fetchUserWithRetry(
  client: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
  maxRetries = 3
): Promise<string> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const user = await client.users.getUser(userId);
      const name =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.emailAddresses[0]?.emailAddress ||
        "Unknown User";
      return name;
    } catch (error: any) {
      lastError = error;
      
      // If rate limited, wait for the retry-after period
      if (error?.status === 429) {
        const retryAfter = error?.retryAfter || Math.pow(2, attempt); // Exponential backoff
        console.warn(`[UserService] Rate limited for user ${userId}, retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(retryAfter * 1000);
        continue;
      }
      
      // For other errors, fail immediately
      throw error;
    }
  }
  
  // If all retries failed
  console.error(`Error fetching user ${userId} after ${maxRetries} attempts:`, lastError);
  return "Unknown User";
}

/**
 * Get user display name from Clerk user ID
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    return await fetchUserWithRetry(client, userId);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return "Unknown User";
  }
}

/**
 * Get multiple user display names at once
 * Deduplicates user IDs to avoid redundant Clerk API calls
 * Includes retry logic with exponential backoff for rate limits
 */
export async function getUserDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  const userMap = new Map<string, string>();
  
  if (userIds.length === 0) {
    return userMap;
  }

  // Deduplicate user IDs to avoid redundant API calls
  const uniqueUserIds = Array.from(new Set(userIds));
  
  console.log(`[UserService] Fetching ${uniqueUserIds.length} unique users (from ${userIds.length} total)`);

  try {
    const client = await clerkClient();
    
    // Process in smaller batches to avoid overwhelming Clerk API
    const BATCH_SIZE = 10;
    const batches: string[][] = [];
    
    for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
      batches.push(uniqueUserIds.slice(i, i + BATCH_SIZE));
    }
    
    // Process batches sequentially with a small delay between them
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      await Promise.all(
        batch.map(async (userId) => {
          const name = await fetchUserWithRetry(client, userId);
          userMap.set(userId, name);
        })
      );
      
      // Add small delay between batches to avoid rate limits
      if (batchIndex < batches.length - 1) {
        await sleep(100); // 100ms delay between batches
      }
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }

  return userMap;
}
