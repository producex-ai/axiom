import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardProps {
  title: string;
  summary: string;
  className?: string;
}

export function SummaryCard({ title, summary, className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm prose-gray dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              // Customize heading styles
              h1: ({ children }) => (
                <h1 className="mb-2 font-semibold text-lg">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-2 font-semibold text-base">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-1 font-semibold text-sm">{children}</h3>
              ),
              // Customize paragraph styles
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              // Customize list styles
              ul: ({ children }) => (
                <ul className="mb-2 ml-4 list-disc">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 ml-4 list-decimal">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-1">{children}</li>,
              // Customize strong/bold text
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              // Customize emphasis/italic text
              em: ({ children }) => <em className="italic">{children}</em>,
              // Customize code (inline)
              code: ({ children }) => (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  {children}
                </code>
              ),
              // Disable links for security (AI-generated content)
              a: ({ children }) => (
                <span className="text-foreground">{children}</span>
              ),
              // Disable images for security
              img: () => null,
            }}
            // Disable HTML in markdown for security
            disallowedElements={["script", "iframe", "object", "embed"]}
            unwrapDisallowed={true}
          >
            {summary}
          </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
