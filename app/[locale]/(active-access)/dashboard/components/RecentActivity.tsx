import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Document } from "../types";
import { getTimeAgo } from "../utils";

interface RecentActivityProps {
  documents: Document[];
  locale: string;
}

export function RecentActivity({ documents, locale }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest document updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.length > 0 ? (
            documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/${locale}/compliance/documents/${doc.id}/edit`}
                className="flex items-start justify-between hover:bg-accent rounded-lg p-2 -m-2 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-sm leading-none">{doc.title}</p>
                  <p className="text-muted-foreground text-xs">
                    Module {doc.module_id}.{doc.sub_module_id} • v
                    {doc.current_version} • {getTimeAgo(doc.updated_at)}
                  </p>
                </div>
                <Badge
                  variant={doc.status === "published" ? "default" : "secondary"}
                  className="ml-2 shrink-0"
                >
                  {doc.status === "published" ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <AlertCircle className="mr-1 h-3 w-3" />
                  )}
                  {doc.status}
                </Badge>
              </Link>
            ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-4">
              No documents yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
