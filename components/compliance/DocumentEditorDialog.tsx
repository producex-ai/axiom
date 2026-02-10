"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Edit, Eye, Globe, Loader2, Save, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentEditorDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  initialMode?: "view" | "edit";
  onSuccess?: () => void;
}

export default function DocumentEditorDialog({
  open,
  onClose,
  documentId,
  documentTitle,
  initialMode = "view",
  onSuccess,
}: DocumentEditorDialogProps) {
  const [mode, setMode] = useState<"view" | "edit">(initialMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: mode === "edit" ? "Start editing your document..." : "",
      }),
    ],
    immediatelyRender: false,
    editable: mode === "edit",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[400px] max-h-[60vh] overflow-y-auto focus:outline-none p-6 bg-white dark:bg-slate-950 rounded-md border border-border",
      },
    },
    content: "",
    onUpdate: ({ editor }) => {
      const currentHtml = editor.getHTML();
      const currentNormalized = currentHtml.trim().replace(/\s+/g, " ");
      const originalNormalized = originalContent.trim().replace(/\s+/g, " ");
      setHasChanges(currentNormalized !== originalNormalized);
    },
  });

  // Load document content when dialog opens
  useEffect(() => {
    if (open && documentId) {
      loadDocument();
    }
  }, [open, documentId]);

  // Update editor editability when mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(mode === "edit");
    }
  }, [mode, editor]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/compliance/documents/${documentId}/content`,
      );

      if (!response.ok) {
        throw new Error("Failed to load document");
      }

      const data = await response.json();
      const html = data.content;

      // Set content in editor
      editor?.commands.setContent(html);
      setOriginalContent(html);
      setHasChanges(false);
    } catch (err) {
      console.error("Error loading document:", err);
      setError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!editor) return;

    try {
      setSaving(true);
      setError(null);

      // Get HTML from editor
      const html = editor.getHTML();

      // Save to API
      const response = await fetch(
        `/api/compliance/documents/${documentId}/content`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: html,
            publish,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save document");
      }

      const data = await response.json();

      // Update original content to reflect saved state
      setOriginalContent(html);
      setHasChanges(false);

      // If published, switch to view mode
      if (publish) {
        setMode("view");
      }

      // Notify parent component
      if (onSuccess) {
        onSuccess();
      }

      // Show success message (you can replace with toast notification)
      alert(data.message || "Document saved successfully");
    } catch (err) {
      console.error("Error saving document:", err);
      setError(err instanceof Error ? err.message : "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = confirm(
        "You have unsaved changes. Are you sure you want to close?",
      );
      if (!confirmed) return;
    }
    setHasChanges(false);
    onClose();
  };

  const toggleMode = () => {
    if (mode === "view") {
      setMode("edit");
    } else {
      if (hasChanges) {
        const confirmed = confirm(
          "You have unsaved changes. Switching to view mode will discard them. Continue?",
        );
        if (!confirmed) return;
      }
      setMode("view");
      // Reload original content
      if (originalContent && editor) {
        editor.commands.setContent(originalContent);
        setHasChanges(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{documentTitle}</DialogTitle>
              <DialogDescription className="mt-2">
                {mode === "view"
                  ? "View document content"
                  : "Edit document content"}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={mode === "edit" ? "default" : "outline"}>
                {mode === "view" ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    View Mode
                  </>
                ) : (
                  <>
                    <Edit className="mr-1 h-3 w-3" />
                    Edit Mode
                  </>
                )}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <EditorContent editor={editor} className="h-full" />
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-muted-foreground text-sm">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={toggleMode}
              disabled={loading || saving}
            >
              {mode === "view" ? (
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </>
              )}
            </Button>

            {mode === "edit" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={!hasChanges || saving || loading}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleSave(true)}
                  disabled={!hasChanges || saving || loading}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Publish
                    </>
                  )}
                </Button>
              </>
            )}

            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
