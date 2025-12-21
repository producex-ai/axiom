import { Clock, FileEdit, ScrollText, User } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LogsPage() {
  const logs = [
    {
      id: 1,
      action: "Document Generated",
      module: "Module 5 - Pest Control",
      user: "John Doe",
      timestamp: "2024-03-19 14:30:00",
      type: "create",
    },
    {
      id: 2,
      action: "Document Updated",
      module: "Module 1 - FSMS",
      user: "Jane Smith",
      timestamp: "2024-03-19 12:15:00",
      type: "update",
    },
    {
      id: 3,
      action: "Review Completed",
      module: "Module 6 - HACCP",
      user: "Mike Johnson",
      timestamp: "2024-03-18 16:45:00",
      type: "complete",
    },
    {
      id: 4,
      action: "Document Generated",
      module: "Module 2 - Field Operations",
      user: "John Doe",
      timestamp: "2024-03-18 10:20:00",
      type: "create",
    },
    {
      id: 5,
      action: "Document Updated",
      module: "Module 5 - Chemical Management",
      user: "Sarah Williams",
      timestamp: "2024-03-17 15:30:00",
      type: "update",
    },
  ];

  const getActionIcon = (type: string) => {
    switch (type) {
      case "create":
        return <FileEdit className="h-4 w-4 text-green-500" />;
      case "update":
        return <FileEdit className="h-4 w-4 text-blue-500" />;
      case "complete":
        return <FileEdit className="h-4 w-4 text-purple-500" />;
      default:
        return <ScrollText className="h-4 w-4" />;
    }
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "create":
        return (
          <Badge variant="default" className="bg-green-500">
            Created
          </Badge>
        );
      case "update":
        return (
          <Badge variant="default" className="bg-blue-500">
            Updated
          </Badge>
        );
      case "complete":
        return (
          <Badge variant="default" className="bg-purple-500">
            Completed
          </Badge>
        );
      default:
        return <Badge>Action</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Activity Logs</h1>
        <p className="mt-2 text-muted-foreground">
          Track all compliance activities and document changes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Today's Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">4</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            All compliance and documentation activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="rounded-lg bg-muted p-2">
                  {getActionIcon(log.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{log.action}</p>
                    {getActionBadge(log.type)}
                  </div>
                  <p className="text-muted-foreground text-sm">{log.module}</p>
                  <div className="flex items-center gap-4 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{log.user}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
