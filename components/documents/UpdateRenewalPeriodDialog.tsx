"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UpdateRenewalPeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  currentRenewal?: "quarterly" | "semi_annually" | "annually" | "2_years" | null;
  onSuccess?: () => void;
}

export function UpdateRenewalPeriodDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  currentRenewal,
  onSuccess,
}: UpdateRenewalPeriodDialogProps) {
  const [renewalPeriod, setRenewalPeriod] = useState<string>(
    currentRenewal || "none",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Reset to current value when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setRenewalPeriod(currentRenewal || "none");
    }
    onOpenChange(open);
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/compliance/documents/${documentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          renewal: renewalPeriod === "none" ? null : renewalPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update renewal period");
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating renewal period:", error);
      // Error handling is done via toast in the parent component
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const getRenewalLabel = (value: string) => {
    const labels: Record<string, string> = {
      quarterly: "Quarterly (3 months)",
      semi_annually: "Semi-Annually (6 months)",
      annually: "Annually (1 year)",
      "2_years": "Every 2 Years",
    };
    return labels[value] || value;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Renewal Period</DialogTitle>
          <DialogDescription>
            Set the renewal period for{" "}
            <span className="font-medium text-foreground">{documentTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="renewal-period">Renewal Period</Label>
            <Select value={renewalPeriod} onValueChange={setRenewalPeriod}>
              <SelectTrigger id="renewal-period">
                <SelectValue placeholder="Select renewal period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="quarterly">
                  {getRenewalLabel("quarterly")}
                </SelectItem>
                <SelectItem value="semi_annually">
                  {getRenewalLabel("semi_annually")}
                </SelectItem>
                <SelectItem value="annually">
                  {getRenewalLabel("annually")}
                </SelectItem>
                <SelectItem value="2_years">
                  {getRenewalLabel("2_years")}
                </SelectItem>
              </SelectContent>
            </Select>
            {currentRenewal && (
              <p className="text-sm text-muted-foreground">
                Current: {getRenewalLabel(currentRenewal)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
