import type { RenewalPeriod } from "./types";

export function calculateExpirationDate(
  publishedAt: string | null,
  renewal: RenewalPeriod | null
): Date | null {
  if (!publishedAt || !renewal) return null;

  const publishDate = new Date(publishedAt);
  if (isNaN(publishDate.getTime())) return null;

  const renewalMonths: Record<RenewalPeriod, number> = {
    monthly: 1,
    quarterly: 3,
    semi_annually: 6,
    annually: 12,
  };

  const months = renewalMonths[renewal];
  const expirationDate = new Date(publishDate);
  expirationDate.setMonth(expirationDate.getMonth() + months);
  return expirationDate;
}

export function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);

  if (isNaN(past.getTime())) return "Unknown";

  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  return past.toLocaleDateString();
}
