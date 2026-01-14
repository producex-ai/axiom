import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
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
                className="-m-2 flex items-start justify-between rounded-lg p-2 transition-colors hover:bg-accent"
              >
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm leading-none">
                    {doc.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Module {doc.module_id}.{doc.sub_module_id} • v
                    {doc.current_version} • {getTimeAgo(doc.updated_at)}
                  </p>
                </div>
                <StatusBadge status={doc.status} className="ml-2 shrink-0" />
              </Link>
            ))
          ) : (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No documents yet
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
