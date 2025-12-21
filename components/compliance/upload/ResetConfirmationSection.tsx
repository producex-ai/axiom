"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

interface ResetConfirmationSectionProps {
  open: boolean;
  isResetting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmationSection: React.FC<
  ResetConfirmationSectionProps
> = ({ open, isResetting, onConfirm, onCancel }) => {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDialogTitle>Reset & Upload New</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            This will delete all uploaded evidence documents for this module.
            You'll need to upload new documents to proceed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-end gap-2">
          <AlertDialogCancel disabled={isResetting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {isResetting ? "Resetting..." : "Reset & Continue"}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
