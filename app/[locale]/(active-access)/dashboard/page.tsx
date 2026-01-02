import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage({ params }: { params: any }) {
  const { locale } = (await params) as { locale: string };

  const stats = [
    {
      title: "Total Documents",
      value: "24",
      icon: FileText,
      trend: "+12%",
      trendUp: true,
    },
    {
      title: "Compliance Score",
      value: "98%",
      icon: ShieldCheck,
      trend: "+2%",
      trendUp: true,
    },
    {
      title: "Active Modules",
      value: "6",
      icon: ClipboardCheck,
      trend: "100%",
      trendUp: true,
    },
    {
      title: "Pending Reviews",
      value: "3",
      icon: AlertCircle,
      trend: "-5",
      trendUp: true,
    },
  ];

  const recentActivity = [
    {
      module: "Module 5",
      title: "Pest Control Document Updated",
      status: "completed",
      time: "2 hours ago",
    },
    {
      module: "Module 1",
      title: "FSMS Document Generated",
      status: "pending",
      time: "5 hours ago",
    },
    {
      module: "Module 6",
      title: "HACCP Plan Review",
      status: "completed",
      time: "1 day ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor your Primus GFS v4.0 compliance status and document generation
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{stat.value}</div>
              <p className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">{stat.trend}</span>
                <span>from last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-sm leading-none">
                      {activity.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {activity.module} • {activity.time}
                    </p>
                  </div>
                  <Badge
                    variant={
                      activity.status === "completed" ? "default" : "secondary"
                    }
                    className="ml-2"
                  >
                    {activity.status === "completed" ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertCircle className="mr-1 h-3 w-3" />
                    )}
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Generate and manage compliance documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link
                href={`/${locale}/dashboard/compliance/module-5`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    Generate Pest Control Doc
                  </p>
                  <p className="text-muted-foreground text-xs">Module 5</p>
                </div>
              </Link>
              <Link
                href={`/${locale}/dashboard/compliance`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">View All Modules</p>
                  <p className="text-muted-foreground text-xs">
                    Primus Compliance
                  </p>
                </div>
              </Link>
              <Link
                href={`/${locale}/dashboard/tasks`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-sm">View Pending Tasks</p>
                  <p className="text-muted-foreground text-xs">
                    3 tasks pending
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
