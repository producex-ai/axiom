"use client";

import { useTranslations } from "next-intl";
import type { Shipment } from "@/actions/shipment";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslatedStatus, statusColorMap } from "@/lib/shipment-utils";

interface StatusCount {
  status: string;
  count: number;
}

interface StatusCardsProps {
  shipments: Shipment[];
  className?: string;
  role?: "supplier" | "distributor";
}

export function StatusCards({
  shipments,
  className,
  role = "distributor",
}: StatusCardsProps) {
  const t = useTranslations(role);
  // Calculate status counts from shipments
  const statusCounts = shipments.reduce(
    (acc: Record<string, number>, shipment) => {
      acc[shipment.status] = (acc[shipment.status] || 0) + 1;
      return acc;
    },
    {},
  );

  // Define the base statuses that apply to all roles
  const baseStatuses = [
    {
      status: "IN_TRANSIT",
      count: statusCounts["IN_TRANSIT"] || 0,
    },
    {
      status: "PENDING_VERIFICATION",
      count: statusCounts["PENDING_VERIFICATION"] || 0,
    },
    {
      status: "PENDING_QC",
      count: statusCounts["PENDING_QC"] || 0,
    },
    {
      status: "PENDING_REPORT",
      count: statusCounts["PENDING_REPORT"] || 0,
    },
  ];

  // Add distributor-specific statuses
  const distributorStatuses = [
    {
      status: "PENDING_APPROVAL",
      count: statusCounts["PENDING_APPROVAL"] || 0,
    },
    {
      status: "REJECTED",
      count: statusCounts["REJECTED"] || 0,
    },
  ];

  // Combine statuses based on role and filter out zero counts
  const statusOrder: StatusCount[] = [
    ...baseStatuses,
    ...(role === "distributor" ? distributorStatuses : []),
  ].filter(({ count }) => count > 0);

  // Don't render anything if no statuses have counts
  if (statusOrder.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid grid-cols-auto gap-3 md:grid-cols-auto lg:grid-cols-auto ${
        className || ""
      }`}
      style={{
        gridTemplateColumns: `repeat(${statusOrder.length}, minmax(0, 1fr))`,
      }}
    >
      {statusOrder.map(({ status, count }) => (
        <Card
          key={status}
          className={`border-0 shadow-sm transition-all duration-200 hover:shadow-md ${statusColorMap[status]}`}
        >
          <CardContent className="p-4">
            <div className="space-y-1 text-center">
              <div className="font-bold text-2xl">{count}</div>
              <div className="font-medium text-sm">
                {getTranslatedStatus(status, t)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
