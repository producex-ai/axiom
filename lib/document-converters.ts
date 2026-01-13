/**
 * Document Conversion Utilities
 *
 * Handles conversion between DOCX and Markdown formats for TipTap editor.
 *
 * Flow:
 * - Load: DOCX (S3) → HTML (mammoth) → Markdown (turndown) → TipTap
 * - Save: TipTap → HTML → Markdown → DOCX (docx lib) → S3
 */

import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import mammoth from "mammoth";
import MarkdownIt from "markdown-it";
import TurndownService from "turndown";

/**
 * Convert DOCX buffer to Markdown
 * Used when loading document into TipTap editor
 */
export async function convertDocxToMarkdown(
  docxBuffer: Buffer,
  documentTitle?: string,
): Promise<string> {
  try {
    // Step 1: Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    const html = result.value;

    // Step 2: Convert HTML to Markdown using turndown
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
      bulletListMarker: "-",
    });

    // Configure turndown to handle common HTML elements
    turndownService.addRule("strikethrough", {
      filter: ["del", "s"],
      replacement: (content) => `~~${content}~~`,
    });

    const markdown = turndownService.turndown(html);

    // Strip the document title if it appears at the beginning
    // This prevents title duplication when saving and reloading
    if (documentTitle) {
      // Remove title in various formats (as heading or plain text)
      // Try multiple patterns to catch different conversion formats
      const patterns = [
        // As H1 heading with #
        new RegExp(
          `^#\\s*${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
          "i",
        ),
        // As plain text at the beginning
        new RegExp(
          `^${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
          "i",
        ),
        // With any heading level (# to ######)
        new RegExp(
          `^#{1,6}\\s*${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n+`,
          "i",
        ),
      ];

      let cleanMarkdown = markdown;
      for (const pattern of patterns) {
        cleanMarkdown = cleanMarkdown.replace(pattern, "");
      }

      return cleanMarkdown.trim();
    }

    return markdown;
  } catch (error) {
    console.error("Error converting DOCX to Markdown:", error);
    throw new Error(
      `Failed to convert DOCX to Markdown: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert Markdown to DOCX buffer
 * Used when saving edited document from TipTap
 */
export async function convertMarkdownToDocx(
  markdown: string,
  documentTitle: string,
): Promise<Buffer> {
  try {
    // Step 1: Convert Markdown to HTML using markdown-it
    const md = new MarkdownIt();
    const html = md.render(markdown);

    // Step 2: Parse HTML and create DOCX elements
    const paragraphs = parseHtmlToDocxElements(html);

    // Step 3: Create DOCX document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: [
            // Title
            new Paragraph({
              text: documentTitle,
              heading: HeadingLevel.TITLE,
              spacing: {
                after: 400,
              },
            }),
            // Content paragraphs
            ...paragraphs,
          ],
        },
      ],
    });

    // Step 4: Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error("Error converting Markdown to DOCX:", error);
    throw new Error(
      `Failed to convert Markdown to DOCX: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Parse HTML to DOCX paragraph elements
 * Simple parser for common elements (h1-h6, p, ul, ol, strong, em, code)
 */
function parseHtmlToDocxElements(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Remove HTML tags and split by newlines for simple parsing
  // This is a basic implementation - you may want to use a proper HTML parser for production
  const lines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .split("\n")
    .filter((line) => line.trim());

  for (const line of lines) {
    // Remove HTML tags but preserve content
    const cleanText = line.replace(/<[^>]*>/g, "").trim();

    if (!cleanText) continue;

    // Detect heading levels
    if (line.includes("<h1>")) {
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        }),
      );
    } else if (line.includes("<h2>")) {
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        }),
      );
    } else if (line.includes("<h3>")) {
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }),
      );
    } else if (line.includes("<h4>")) {
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 100 },
        }),
      );
    } else if (line.includes("<li>")) {
      // List item
      paragraphs.push(
        new Paragraph({
          text: `• ${cleanText}`,
          spacing: { before: 60, after: 60 },
        }),
      );
    } else if (line.includes("<strong>") || line.includes("<b>")) {
      // Bold text
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cleanText,
              bold: true,
            }),
          ],
          spacing: { before: 100, after: 100 },
        }),
      );
    } else if (line.includes("<code>") || line.includes("<pre>")) {
      // Code block
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          spacing: { before: 100, after: 100 },
        }),
      );
    } else {
      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          text: cleanText,
          spacing: { before: 100, after: 100 },
        }),
      );
    }
  }

  return paragraphs;
}

/**
 * Convert HTML to Markdown (utility function)
 * Can be used for preview or other purposes
 */
export function convertHtmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Add rule to preserve line breaks properly
  turndownService.addRule("lineBreaks", {
    filter: ["br"],
    replacement: () => "  \n",
  });

  // Add rule for strikethrough
  turndownService.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });

  // Clean up HTML before conversion
  let cleanHtml = html
    // Remove TipTap-specific classes and data attributes
    .replace(/\s+class="[^"]*"/g, "")
    .replace(/\s+data-[^=]*="[^"]*"/g, "")
    // Remove empty paragraphs that TipTap might add
    .replace(/<p><\/p>/g, "")
    .replace(/<p>\s*<\/p>/g, "");

  const markdown = turndownService.turndown(cleanHtml);

  // Clean up the markdown output
  return (
    markdown
      .trim()
      // Remove excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Ensure consistent spacing
      .replace(/\n\s+\n/g, "\n\n")
  );
}

/**
 * Convert Markdown to HTML (utility function)
 * Can be used for preview
 */
export function convertMarkdownToHtml(markdown: string): string {
  const md = new MarkdownIt({
    html: true,
    breaks: true,
    linkify: true,
  });

  // Clean markdown before conversion
  const cleanMarkdown = markdown
    .trim()
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n");

  return md.render(cleanMarkdown);
}
