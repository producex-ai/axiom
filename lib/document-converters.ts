/**
 * Document Conversion Utilities
 *
 * Handles conversion between DOCX and HTML formats for TipTap editor.
 *
 * Flow:
 * - Load: DOCX (S3) → HTML (mammoth) → TipTap
 * - Save: TipTap → HTML → DOCX (docx library) → S3
 */

import {
  AlignmentType,
  convertInchesToTwip,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  UnderlineType,
} from "docx";
import mammoth from "mammoth";
import * as htmlparser2 from "htmlparser2";
import { Element, Text as DomText } from "domhandler";


/**
 * Convert DOCX buffer to HTML
 * Used when loading document into TipTap editor
 */
export async function convertDocxToHtml(
  docxBuffer: Buffer,
  documentTitle?: string,
): Promise<string> {
  try {
    // Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml({ buffer: docxBuffer });
    let html = result.value;

    // Strip the document title if it appears at the beginning
    // This prevents title duplication when saving and reloading
    if (documentTitle) {
      // Remove title in various formats (as heading or plain text)
      const patterns = [
        // As H1 heading
        new RegExp(
          `<h1[^>]*>\\s*${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</h1>`,
          "gi",
        ),
        // As any heading level
        new RegExp(
          `<h[1-6][^>]*>\\s*${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</h[1-6]>`,
          "gi",
        ),
        // As paragraph at the beginning
        new RegExp(
          `^\\s*<p[^>]*>\\s*${documentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</p>`,
          "i",
        ),
      ];

      for (const pattern of patterns) {
        html = html.replace(pattern, "");
      }

      html = html.trim();
    }

    return html;
  } catch (error) {
    console.error("Error converting DOCX to HTML:", error);
    throw new Error(
      `Failed to convert DOCX to HTML: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convert HTML to DOCX buffer
 * Used when saving edited document from TipTap
 */
export async function convertHtmlToDocx(
  html: string,
  documentTitle: string,
): Promise<Buffer> {
  try {
    // Parse HTML
    const dom = htmlparser2.parseDocument(html);
    const paragraphs: Paragraph[] = [];

    // Add title
    paragraphs.push(
      new Paragraph({
        text: documentTitle,
        heading: HeadingLevel.TITLE,
        spacing: {
          after: 400,
        },
      }),
    );

    // Convert DOM nodes to DOCX paragraphs
    const processNode = (node: any): void => {
      if (node.type === "tag") {
        const element = node as Element;
        const tagName = element.name.toLowerCase();

        switch (tagName) {
          case "h1":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 },
              }),
            );
            break;
          case "h2":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 },
              }),
            );
            break;
          case "h3":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 },
              }),
            );
            break;
          case "h4":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 },
              }),
            );
            break;
          case "h5":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_5,
                spacing: { before: 200, after: 100 },
              }),
            );
            break;
          case "h6":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                heading: HeadingLevel.HEADING_6,
                spacing: { before: 200, after: 100 },
              }),
            );
            break;
          case "p":
            const textRuns = extractTextRuns(element);
            if (textRuns.length > 0 || element.children.length > 0) {
              paragraphs.push(
                new Paragraph({
                  children: textRuns.length > 0 ? textRuns : [new TextRun("")],
                  spacing: { before: 100, after: 100 },
                }),
              );
            }
            break;
          case "ul":
          case "ol":
            // Process list items
            element.children.forEach((child: any) => {
              if (child.type === "tag" && child.name === "li") {
                paragraphs.push(
                  new Paragraph({
                    children: extractTextRuns(child as Element),
                    bullet: tagName === "ul" ? { level: 0 } : undefined,
                    numbering:
                      tagName === "ol"
                        ? { reference: "default-numbering", level: 0 }
                        : undefined,
                    spacing: { before: 60, after: 60 },
                  }),
                );
              }
            });
            break;
          case "blockquote":
            paragraphs.push(
              new Paragraph({
                children: extractTextRuns(element),
                spacing: { before: 100, after: 100 },
                indent: { left: 720 },
                border: {
                  left: {
                    color: "CCCCCC",
                    space: 1,
                    style: "single",
                    size: 6,
                  },
                },
              }),
            );
            break;
          case "pre":
          case "code":
            const codeText = extractPlainText(element);
            if (codeText) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: codeText,
                      font: "Courier New",
                    }),
                  ],
                  spacing: { before: 100, after: 100 },
                  shading: {
                    fill: "F5F5F5",
                  },
                }),
              );
            }
            break;
          case "hr":
            paragraphs.push(
              new Paragraph({
                border: {
                  bottom: {
                    color: "CCCCCC",
                    space: 1,
                    style: "single",
                    size: 6,
                  },
                },
                spacing: { before: 100, after: 100 },
              }),
            );
            break;
          case "br":
            paragraphs.push(new Paragraph({ text: "" }));
            break;
          default:
            // Process children for other tags
            if (element.children) {
              element.children.forEach((child: any) => processNode(child));
            }
        }
      }
    };

    // Helper function to extract text runs with formatting
    const extractTextRuns = (element: Element): TextRun[] => {
      const runs: TextRun[] = [];

      const processTextNode = (
        node: any,
        formatting: {
          bold?: boolean;
          italic?: boolean;
          underline?: boolean;
          strike?: boolean;
        } = {},
      ): void => {
        if (node.type === "text") {
          const text = (node as DomText).data;
          if (text.trim()) {
            runs.push(
              new TextRun({
                text: text,
                bold: formatting.bold,
                italics: formatting.italic,
                underline: formatting.underline
                  ? { type: UnderlineType.SINGLE }
                  : undefined,
                strike: formatting.strike,
              }),
            );
          }
        } else if (node.type === "tag") {
          const elem = node as Element;
          const tagName = elem.name.toLowerCase();
          const newFormatting = { ...formatting };

          // Update formatting based on tag
          if (tagName === "strong" || tagName === "b") {
            newFormatting.bold = true;
          }
          if (tagName === "em" || tagName === "i") {
            newFormatting.italic = true;
          }
          if (tagName === "u") {
            newFormatting.underline = true;
          }
          if (tagName === "s" || tagName === "del" || tagName === "strike") {
            newFormatting.strike = true;
          }

          // Handle links
          if (tagName === "a") {
            const href = elem.attribs?.href;
            const linkText = extractPlainText(elem);
            if (href && linkText) {
              runs.push(
                new TextRun({
                  text: linkText,
                  color: "0000FF",
                  underline: { type: UnderlineType.SINGLE },
                }),
              );
              return;
            }
          }

          // Handle code
          if (tagName === "code") {
            const codeText = extractPlainText(elem);
            if (codeText) {
              runs.push(
                new TextRun({
                  text: codeText,
                  font: "Courier New",
                  shading: {
                    fill: "F5F5F5",
                  },
                }),
              );
              return;
            }
          }

          // Process children with updated formatting
          if (elem.children) {
            elem.children.forEach((child: any) =>
              processTextNode(child, newFormatting),
            );
          }
        }
      };

      if (element.children) {
        element.children.forEach((child: any) => processTextNode(child));
      }

      return runs;
    };

    // Helper function to extract plain text from element
    const extractPlainText = (element: Element): string => {
      let text = "";
      const traverse = (node: any): void => {
        if (node.type === "text") {
          text += (node as DomText).data;
        } else if (node.type === "tag" && (node as Element).children) {
          (node as Element).children.forEach(traverse);
        }
      };
      if (element.children) {
        element.children.forEach(traverse);
      }
      return text;
    };

    // Process all top-level nodes
    if (dom.children) {
      dom.children.forEach((child: any) => processNode(child));
    }

    // Ensure at least one paragraph exists
    if (paragraphs.length === 1) {
      // Only title, add empty paragraph
      paragraphs.push(new Paragraph({ text: "" }));
    }

    // Create DOCX document
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
          children: paragraphs,
        },
      ],
    });

    // Generate DOCX buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    console.error("Error converting HTML to DOCX:", error);
    throw new Error(
      `Failed to convert HTML to DOCX: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

