import { auth } from "@clerk/nextjs/server";
import { Calendar, CheckCircle2, Clock, History, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getDailyLogsAction } from "@/actions/daily-logs";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getStatusBadge(status: string) {
  const variants = {
    PENDING: {
      variant: "secondary" as const,
      icon: Clock,
      label: "Pending",
    },
    PENDING_APPROVAL: {
      variant: "default" as const,
      icon: Clock,
      label: "Pending Review",
    },
    APPROVED: {
      variant: "outline" as const,
      icon: CheckCircle2,
      label: "Approved",
    },
    REJECTED: {
      variant: "destructive" as const,
      icon: XCircle,
      label: "Rejected",
    },
  };

  const config = variants[status as keyof typeof variants] || variants.PENDING;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16">
      <History className="h-16 w-16 text-muted-foreground/40" />
      <h3 className="mt-4 font-semibold text-lg">No history found</h3>
      <p className="mt-2 text-center text-muted-foreground text-sm">
        You don't have any completed or past tasks in your history yet.
      </p>
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

export default async function TaskHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect("/login");
  }

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;

  // Get all logs before today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const allLogs = await getDailyLogsAction({
    endDate: yesterday.toISOString().split("T")[0],
    status: "APPROVED",
  });

  // Filter for current user and sort by date descending
  const userLogs = allLogs
    .filter((log) => log.assignee_id === userId || log.reviewer_id === userId)
    .sort(
      (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime(),
    );

  // Pagination
  const totalPages = Math.ceil(userLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex_ = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = userLogs.slice(startIndex, endIndex_);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">My Task History</h1>
        <p className="mt-2 text-muted-foreground">
          View your approved past daily log tasks
        </p>
      </div>

      {userLogs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const isAssignee = log.assignee_id === userId;
                  const totalTasks = Object.keys(log.tasks).length;
                  const completedTasks = Object.values(log.tasks).filter(
                    Boolean,
                  ).length;

                  return (
                    <TableRow key={log.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link
                          href={`/tasks/${log.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(log.log_date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/tasks/${log.id}`}
                          className="hover:underline"
                        >
                          {log.template_name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${log.id}`}>
                          {log.template_category ? (
                            <Badge variant="outline">
                              {log.template_category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${log.id}`}>
                          <Badge variant={isAssignee ? "secondary" : "default"}>
                            {isAssignee ? "Assignee" : "Reviewer"}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/tasks/${log.id}`}>
                          {getStatusBadge(log.status)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/tasks/${log.id}`}
                          className="hover:underline"
                        >
                          <span className="text-sm">
                            {completedTasks}/{totalTasks}
                          </span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href={
                      currentPage > 1
                        ? `/tasks/history?page=${currentPage - 1}`
                        : "#"
                    }
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href={`/tasks/history?page=${page}`}
                            isActive={page === currentPage}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  },
                )}

                <PaginationItem>
                  <PaginationNext
                    href={
                      currentPage < totalPages
                        ? `/tasks/history?page=${currentPage + 1}`
                        : "#"
                    }
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
