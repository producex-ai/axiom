import { cookies } from "next/headers";
import type { DashboardData } from "./types";

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const [overviewRes, documentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/frameworks/primus/overview`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
      }),
      fetch(`${baseUrl}/api/compliance/all-documents`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
      }),
    ]);

    if (!overviewRes.ok || !documentsRes.ok) {
      console.error("API Error:", {
        overview: overviewRes.status,
        documents: documentsRes.status,
      });
      return { overview: null, documents: [] };
    }

    const overview = await overviewRes.json();
    const documentsData = await documentsRes.json();

    return { overview, documents: documentsData.documents || [] };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { overview: null, documents: [] };
  }
}
