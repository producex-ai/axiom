import { clerkClient } from "@clerk/nextjs/server";

/**
 * Get user display name from Clerk user ID
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.emailAddresses[0]?.emailAddress ||
      "Unknown User";
    
    return name;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return "Unknown User";
  }
}

/**
 * Get multiple user display names at once
 */
export async function getUserDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  const userMap = new Map<string, string>();
  
  if (userIds.length === 0) {
    return userMap;
  }

  try {
    const client = await clerkClient();
    
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const user = await client.users.getUser(userId);
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.emailAddresses[0]?.emailAddress ||
            "Unknown User";
          userMap.set(userId, name);
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          userMap.set(userId, "Unknown User");
        }
      })
    );
  } catch (error) {
    console.error("Error fetching users:", error);
  }

  return userMap;
}
