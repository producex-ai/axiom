import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TableFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchPlaceholder?: string;
  filterStatusPlaceholder?: string;
  showClearFilters?: boolean;
  role?: "supplier" | "distributor";
}

export function TableFilters({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  searchPlaceholder = "Search by lot number, supplier/distributor...",
  filterStatusPlaceholder = "Filter by status",
  showClearFilters = true,
  role = "distributor",
}: TableFiltersProps) {
  const tFilters = useTranslations(`${role}.filters`);
  const handleClearFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
  };

  const hasActiveFilters = searchValue || statusFilter !== "all";

  const statusOptions = [
    { value: "all", label: tFilters("status.all") },
    { value: "IN_TRANSIT", label: tFilters("status.inTransit") },
    {
      value: "PENDING_VERIFICATION",
      label: tFilters("status.pendingVerification"),
    },
    { value: "PENDING_QC", label: tFilters("status.pendingQc") },
    { value: "PENDING_REPORT", label: tFilters("status.pendingReport") },
    { value: "PENDING_APPROVAL", label: tFilters("status.pendingApproval") },
    { value: "APPROVED", label: tFilters("status.approved") },
    { value: "REJECTED", label: tFilters("status.rejected") },
  ];

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-sm flex-1">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={filterStatusPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showClearFilters && hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            {tFilters("clear")}
          </Button>
        )}
      </div>
    </div>
  );
}
