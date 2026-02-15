"use client";

import { Calendar, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyLogWithDetails } from "@/db/queries/daily-logs";

const ITEMS_PER_PAGE = 10;

type ViewMode = "personal" | "organization";

interface TaskListTableProps {
  logs: DailyLogWithDetails[];
  currentUserId?: string; // If provided, shows "My Role" column
  viewMode?: ViewMode; // "personal" or "organization"
  emptyState?: {
    icon: React.ReactNode;
    title: string;
    description: string;
  };
  stats?: {
    total: number;
    pending?: number;
    pendingReview?: number;
    rejected?: number;
  };
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TaskListTable({
  logs,
  currentUserId,
  viewMode = "organization",
  emptyState,
  stats,
}: TaskListTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current page from URL
  const currentPage = Number(searchParams.get("page")) || 1;

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(
      logs.map((log) => log.template_category).filter(Boolean) as string[],
    );
    return Array.from(cats).sort();
  }, [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = log.template_name.toLowerCase().includes(query);
        const matchesCategory = log.template_category
          ?.toLowerCase()
          .includes(query);
        const matchesAssignee = log.assignee_name
          ?.toLowerCase()
          .includes(query);
        const matchesReviewer = log.reviewer_name
          ?.toLowerCase()
          .includes(query);
        if (
          !matchesName &&
          !matchesCategory &&
          !matchesAssignee &&
          !matchesReviewer
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && log.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (
        categoryFilter !== "all" &&
        log.template_category !== categoryFilter
      ) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, statusFilter, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Update URL with new page
  const updatePage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Reset to page 1 when filters change
  const handleFilterChange = () => {
    if (currentPage !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const DefaultEmptyState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border bg-card py-16">
      {emptyState?.icon}
      <h3 className="mt-4 font-semibold text-lg">
        {emptyState?.title || "No logs found"}
      </h3>
      <p className="mt-2 text-center text-muted-foreground text-sm">
        {emptyState?.description || "No logs match your current filters."}
      </p>
    </div>
  );

  return (
    <div className="min-w-0 space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="font-medium text-muted-foreground text-sm">
              Total Active
            </p>
            <p className="mt-2 font-bold text-2xl">{stats.total}</p>
          </div>
          {stats.pending !== undefined && (
            <div className="rounded-lg border bg-card p-4">
              <p className="font-medium text-muted-foreground text-sm">
                Pending
              </p>
              <p className="mt-2 font-bold text-2xl text-orange-500">
                {stats.pending}
              </p>
            </div>
          )}
          {stats.pendingReview !== undefined && (
            <div className="rounded-lg border bg-card p-4">
              <p className="font-medium text-muted-foreground text-sm">
                Pending Review
              </p>
              <p className="mt-2 font-bold text-2xl text-blue-500">
                {stats.pendingReview}
              </p>
            </div>
          )}
          {stats.rejected !== undefined && (
            <div className="rounded-lg border bg-card p-4">
              <p className="font-medium text-muted-foreground text-sm">
                Rejected
              </p>
              <p className="mt-2 font-bold text-2xl text-red-500">
                {stats.rejected}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleFilterChange();
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            handleFilterChange();
          }}
        >
          <SelectTrigger className="w-full sm:w-45">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PENDING_APPROVAL">Pending Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="OBSOLETE">Obsolete</SelectItem>
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select
            value={categoryFilter}
            onValueChange={(value) => {
              setCategoryFilter(value);
              handleFilterChange();
            }}
          >
            <SelectTrigger className="w-full sm:w-45">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      {filteredLogs.length === 0 ? (
        <DefaultEmptyState />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Log Name</TableHead>
                  <TableHead>Category</TableHead>
                  {viewMode === "personal" && currentUserId && (
                    <TableHead>My Role</TableHead>
                  )}
                  {viewMode === "organization" && (
                    <>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Reviewer</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map((log) => {
                  const isAssignee = log.assignee_id === currentUserId;
                  const totalTasks = Object.keys(log.tasks).length;
                  const completedTasks = Object.values(log.tasks).filter(
                    Boolean,
                  ).length;

                  return (
                    <TableRow key={log.id} className="cursor-pointer">
                      <TableCell className="whitespace-nowrap font-medium">
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
                      {viewMode === "personal" && currentUserId && (
                        <TableCell className="whitespace-nowrap">
                          <Link href={`/tasks/${log.id}`}>
                            <span className="text-sm">
                              {isAssignee ? "Assignee" : "Reviewer"}
                            </span>
                          </Link>
                        </TableCell>
                      )}
                      {viewMode === "organization" && (
                        <>
                          <TableCell className="whitespace-nowrap">
                            <Link href={`/tasks/${log.id}`}>
                              <span className="text-muted-foreground text-sm">
                                {log.assignee_name || "Unassigned"}
                              </span>
                            </Link>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Link href={`/tasks/${log.id}`}>
                              <span className="text-muted-foreground text-sm">
                                {log.reviewer_name || "No Reviewer"}
                              </span>
                            </Link>
                          </TableCell>
                        </>
                      )}
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/tasks/${log.id}`}>
                          <StatusBadge status={log.status} />
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) updatePage(currentPage - 1);
                    }}
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
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              updatePage(page);
                            }}
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
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages) updatePage(currentPage + 1);
                    }}
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
