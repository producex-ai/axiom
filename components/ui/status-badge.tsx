import {
  AlertCircle,
  CheckCircle2,
  Clock,
  type LucideIcon,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase();

  const variants: Record<
    string,
    {
      variant: "default" | "warning" | "success" | "destructive" | "secondary";
      icon: LucideIcon;
      label: string;
    }
  > = {
    PENDING: {
      variant: "default",
      icon: Clock,
      label: "Pending",
    },
    PENDING_APPROVAL: {
      variant: "warning",
      icon: Clock,
      label: "Pending Review",
    },
    APPROVED: {
      variant: "success",
      icon: CheckCircle2,
      label: "Approved",
    },
    REJECTED: {
      variant: "destructive",
      icon: XCircle,
      label: "Rejected",
    },
    PUBLISHED: {
      variant: "success",
      icon: CheckCircle2,
      label: "Published",
    },
  };

  const config = variants[normalizedStatus];

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        <AlertCircle className="h-3 w-3" />
        <span className="capitalize">{status.toLowerCase()}</span>
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 ${className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
