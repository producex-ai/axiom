/**
 * Revision history queries and helpers
 *
 * Provides client-side functions for fetching and displaying
 * document revision history
 */

/**
 * Revision data structure
 */
export interface DocumentRevisionInfo {
  id: string;
  version: number;
  action: "created" | "edited" | "published" | "restored";
  status: "draft" | "published" | "archived";
  userId: string;
  contentKey: string;
  notes: string | null;
  createdAt: string;
}

/**
 * Fetch document revision history
 */
export async function fetchDocumentHistory(documentId: string): Promise<{
  success: boolean;
  documentId: string;
  documentTitle: string;
  totalRevisions: number;
  revisions: DocumentRevisionInfo[];
}> {
  const res = await fetch(`/api/compliance/documents/${documentId}/history`);

  if (!res.ok) {
    throw new Error("Failed to fetch document history");
  }

  return res.json();
}

/**
 * Format action for display
 */
export function formatAction(
  action: "created" | "edited" | "published" | "restored",
): string {
  const actionMap = {
    created: "Created",
    edited: "Edited",
    published: "Published",
    restored: "Restored",
  };
  return actionMap[action];
}

/**
 * Format action badge color
 */
export function getActionColor(
  action: "created" | "edited" | "published" | "restored",
): string {
  const colorMap = {
    created: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    edited: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    published:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    restored:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };
  return colorMap[action];
}

/**
 * Format date for display
 */
export function formatRevisionDate(dateString: string): {
  date: string;
  time: string;
} {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatRevisionDate(dateString).date;
}
