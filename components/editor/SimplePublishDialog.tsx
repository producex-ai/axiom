"use client";

import React from "react";
import { Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SimplePublishDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPublishing: boolean;
}

export function SimplePublishDialog({
  open,
  onClose,
  onConfirm,
  isPublishing,
}: SimplePublishDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Publish Document
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to publish this document?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPublishing}>
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
