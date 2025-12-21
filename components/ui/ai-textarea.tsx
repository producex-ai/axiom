import { Loader2, Sparkles, Undo2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { improveText } from "@/lib/ai/improve-text";
import type { PromptKey } from "@/lib/constants/ai-prompts";
import { cn } from "@/lib/utils";

export interface AITextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  promptKey?: PromptKey;
  onAIRewrite?: (originalText: string, improvedText: string) => void;
}

const AITextarea = React.forwardRef<HTMLTextAreaElement, AITextareaProps>(
  ({ className, promptKey = "improve", onAIRewrite, ...props }, ref) => {
    const [isRewriting, setIsRewriting] = React.useState(false);
    const [previousText, setPreviousText] = React.useState<string>("");
    const [hasImprovement, setHasImprovement] = React.useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Use the forwarded ref or our internal ref
    const combinedRef = React.useCallback(
      (node: HTMLTextAreaElement) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleAIRewrite = async () => {
      const textarea = textareaRef.current;
      if (!textarea || !textarea.value.trim()) return;

      const originalText = textarea.value;

      // Basic validation
      if (originalText.length < 10) {
        console.error("Text is too short (minimum 10 characters)");
        return;
      }

      if (originalText.length > 10000) {
        console.error("Text is too long (maximum 10,000 characters)");
        return;
      }

      setIsRewriting(true);
      setPreviousText(originalText);

      try {
        const result = await improveText({ text: originalText, promptKey });

        // Call the callback if provided to update the state
        onAIRewrite?.(result.originalText, result.improvedText);
        setHasImprovement(true);
      } catch (error) {
        console.error("Failed to rewrite text:", error);
        // TODO: Handle error - could show a toast or error message
      } finally {
        setIsRewriting(false);
      }
    };

    const handleUndo = () => {
      if (previousText) {
        onAIRewrite?.(previousText, previousText); // Restore original text
        setHasImprovement(false);
        setPreviousText("");
      }
    };
    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[120px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 pb-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={combinedRef}
          {...props}
        />

        <div className="absolute right-3 bottom-3 flex gap-1">
          {hasImprovement && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="h-7 w-7 rounded-md border border-border/50 p-0 shadow-sm hover:bg-secondary/80"
              title="Undo AI Changes"
            >
              <Undo2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleAIRewrite}
            disabled={isRewriting}
            className="h-7 w-7 rounded-md border border-border/50 p-0 shadow-sm hover:bg-primary/10"
            title="AI Rewrite"
          >
            {isRewriting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  },
);

AITextarea.displayName = "AITextarea";

export { AITextarea };
