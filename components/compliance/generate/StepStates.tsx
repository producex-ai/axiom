"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title: string;
  message: string;
  onClose: () => void;
}

export function ErrorState({ title, message, onClose }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div className="text-center">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-slate-600 text-sm">{message}</p>
      </div>
      <Button onClick={onClose} variant="outline">
        Close
      </Button>
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({
  message = "Loading compliance questions...",
}: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      <p className="text-slate-600 text-sm">{message}</p>
    </div>
  );
}
