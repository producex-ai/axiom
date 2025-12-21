"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  onRefresh: () => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function RefreshButton({
  onRefresh,
  isLoading,
  children,
}: RefreshButtonProps) {
  return (
    <Button
      onClick={onRefresh}
      variant="outline"
      disabled={isLoading}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
      {children || "Refresh"}
    </Button>
  );
}
