"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { OrgMember } from "@/actions/clerk";
import { updateDailyLogAssignmentAction } from "@/actions/daily-logs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logId: string;
  currentAssigneeId: string;
  currentReviewerId: string | null;
  members: OrgMember[];
}

export function EditAssignmentDialog({
  open,
  onOpenChange,
  logId,
  currentAssigneeId,
  currentReviewerId,
  members,
}: EditAssignmentDialogProps) {
  const [assigneeId, setAssigneeId] = useState(currentAssigneeId);
  const [reviewerId, setReviewerId] = useState(currentReviewerId || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!assigneeId) {
      toast({
        title: "Error",
        description: "Please select an assignee",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await updateDailyLogAssignmentAction(
        logId,
        assigneeId,
        reviewerId || null,
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Assignments updated successfully",
        });
        onOpenChange(false);
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to update assignments",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating assignments:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit Assignments</DialogTitle>
          <DialogDescription>
            Update the assignee and reviewer for this daily log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="assignee_select">
              Assignee <span className="text-destructive">*</span>
            </Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-full" id="assignee_select">
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewer_select">Reviewer</Label>
            <Select value={reviewerId} onValueChange={setReviewerId}>
              <SelectTrigger className="w-full" id="reviewer_select">
                <SelectValue placeholder="Select reviewer (optional)" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
