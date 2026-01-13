import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DocumentsByExpiry } from "../types";

interface DocumentRenewalsProps {
  documentsByExpiry: DocumentsByExpiry;
  locale: string;
}

export function DocumentRenewals({
  documentsByExpiry,
  locale,
}: DocumentRenewalsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Renewals</CardTitle>
        <CardDescription>Documents requiring attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documentsByExpiry.overdue > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-900">
                  {documentsByExpiry.overdue} Overdue Document
                  {documentsByExpiry.overdue > 1 ? "s" : ""}
                </p>
                <p className="text-red-700 text-xs">
                  Requires immediate renewal
                </p>
              </div>
              <Link
                href={`/${locale}/documents`}
                className="text-red-600 text-xs hover:underline shrink-0"
              >
                View
              </Link>
            </div>
          )}

          {documentsByExpiry.expiring30Days > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <Clock className="h-5 w-5 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm text-orange-900">
                  {documentsByExpiry.expiring30Days} Expiring in 30 Days
                </p>
                <p className="text-orange-700 text-xs">Plan for renewal soon</p>
              </div>
              <Link
                href={`/${locale}/documents`}
                className="text-orange-600 text-xs hover:underline shrink-0"
              >
                View
              </Link>
            </div>
          )}

          {documentsByExpiry.expiring90Days > 0 && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Calendar className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {documentsByExpiry.expiring90Days} Expiring in 90 Days
                </p>
                <p className="text-muted-foreground text-xs">
                  Keep track of upcoming renewals
                </p>
              </div>
              <Link
                href={`/${locale}/documents`}
                className="text-blue-600 text-xs hover:underline shrink-0"
              >
                View
              </Link>
            </div>
          )}

          {documentsByExpiry.overdue === 0 &&
            documentsByExpiry.expiring30Days === 0 &&
            documentsByExpiry.expiring90Days === 0 && (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-green-900">
                    All Up to Date
                  </p>
                  <p className="text-green-700 text-xs">
                    No documents need renewal
                  </p>
                </div>
              </div>
            )}

          <Link
            href={`/${locale}/compliance`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent mt-2"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium text-sm">View All Modules</p>
              <p className="text-muted-foreground text-xs">
                Manage compliance documents
              </p>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
