import { AlertTriangle, Clock, FileText, ShieldCheck } from "lucide-react";
import React from "react";
import { fetchDashboardData } from "./data";
import { calculateExpirationDate } from "./utils";
import { StatCard } from "./components/StatCard";
import { ModuleProgress } from "./components/ModuleProgress";
import { RecentActivity } from "./components/RecentActivity";
import { DocumentRenewals } from "./components/DocumentRenewals";

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const { overview, documents } = await fetchDashboardData();

  // Calculate metrics
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  const ninetyDaysFromNow = new Date(today);
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  // Filter compliance documents only
  const complianceDocuments = documents.filter(
    (doc) => doc.doc_type === "compliance",
  );
  const publishedDocuments = complianceDocuments.filter(
    (doc) => doc.status === "published",
  );

  // Calculate expiring and overdue documents
  const documentsByExpiry = {
    expiring30Days: 0,
    expiring90Days: 0,
    overdue: 0,
  };

  publishedDocuments.forEach((doc) => {
    const expirationDate = calculateExpirationDate(
      doc.published_at,
      doc.renewal,
    );
    if (!expirationDate) return;

    if (expirationDate < today) {
      documentsByExpiry.overdue++;
    } else if (expirationDate <= thirtyDaysFromNow) {
      documentsByExpiry.expiring30Days++;
    } else if (expirationDate <= ninetyDaysFromNow) {
      documentsByExpiry.expiring90Days++;
    }
  });

  // Calculate compliance health score from overview data
  const complianceMetrics = overview?.modules.reduce(
    (acc, module) => ({
      totalRequired: acc.totalRequired + (module.totalSubModules || 0),
      totalReady: acc.totalReady + (module.documentsReady || 0),
    }),
    { totalRequired: 0, totalReady: 0 },
  ) || { totalRequired: 0, totalReady: 0 };

  const complianceScore =
    complianceMetrics.totalRequired > 0
      ? Math.round(
          (complianceMetrics.totalReady / complianceMetrics.totalRequired) *
            100,
        )
      : 0;

  // Recent activity from documents
  const recentDocs = [...documents]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 5);

  const stats = [
    {
      title: "Compliance Health",
      value: `${complianceScore}%`,
      icon: ShieldCheck,
      description: `${complianceMetrics.totalReady} of ${complianceMetrics.totalRequired} sub-modules ready`,
      color:
        complianceScore >= 80
          ? "text-green-500"
          : complianceScore >= 50
            ? "text-yellow-500"
            : "text-red-500",
    },
    {
      title: "Total Documents",
      value: complianceDocuments.length.toString(),
      icon: FileText,
      description: `${publishedDocuments.length} published, ${complianceDocuments.length - publishedDocuments.length} draft`,
      color: "text-blue-500",
    },
    {
      title: "Expiring Soon",
      value: (
        documentsByExpiry.expiring30Days + documentsByExpiry.expiring90Days
      ).toString(),
      icon: Clock,
      description: `${documentsByExpiry.expiring30Days} in 30 days, ${documentsByExpiry.expiring90Days} in 90 days`,
      color:
        documentsByExpiry.expiring30Days > 0
          ? "text-orange-500"
          : "text-gray-500",
    },
    {
      title: "Overdue Documents",
      value: documentsByExpiry.overdue.toString(),
      icon: AlertTriangle,
      description:
        documentsByExpiry.overdue > 0
          ? "Requires immediate attention"
          : "All documents up to date",
      color: documentsByExpiry.overdue > 0 ? "text-red-500" : "text-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor your {overview?.frameworkName || "Primus GFS v4.0"} compliance
          status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <ModuleProgress modules={overview?.modules || []} />

      <div className="grid gap-4 md:grid-cols-2">
        <RecentActivity documents={recentDocs} locale={locale} />
        <DocumentRenewals
          documentsByExpiry={documentsByExpiry}
          locale={locale}
        />
      </div>
    </div>
  );
}
