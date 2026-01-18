"use client";

import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface SimplePublishDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  isPublishing: boolean;
}

export function SimplePublishDialog({
  open,
  onClose,
  onConfirm,
  isPublishing,
}: SimplePublishDialogProps) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setComment("");
      setError("");
    }
  }, [open]);

  const handleConfirm = () => {
    const trimmedComment = comment.trim();
    if (!trimmedComment) {
      setError("Comment is required");
      return;
    }
    setError("");
    onConfirm(trimmedComment);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Publish Document
          </DialogTitle>
          <DialogDescription>
            Add a comment describing the changes you&apos;re publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="publish-comment">
            Comment <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="publish-comment"
            placeholder="Describe the changes or updates..."
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (error) setError("");
            }}
            disabled={isPublishing}
            rows={4}
            className={error ? "border-destructive" : ""}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPublishing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPublishing}>
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
