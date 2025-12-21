import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export async function createDocxBufferFromText(text: string): Promise<Buffer> {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines (but add them as empty paragraphs for spacing)
    if (trimmedLine.length === 0) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Detect headings by patterns (you can customize these patterns)
    let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
    let textContent = trimmedLine;

    // Pattern 1: Lines ending with ":" might be headings
    if (trimmedLine.endsWith(":") && trimmedLine.length < 100) {
      heading = HeadingLevel.HEADING_2;
      textContent = trimmedLine.slice(0, -1); // Remove the colon
    }

    // Pattern 2: Lines in ALL CAPS might be headings (if short)
    if (
      trimmedLine === trimmedLine.toUpperCase() &&
      trimmedLine.length < 80 &&
      trimmedLine.length > 3 &&
      !heading
    ) {
      heading = HeadingLevel.HEADING_1;
    }

    // Pattern 3: Detect numbered sections (e.g., "1. ", "1.1 ", "1.1.1 ")
    const numberedSection = trimmedLine.match(/^(\d+\.)+\s+(.+)/);
    if (numberedSection && !heading) {
      const depth = (numberedSection[1].match(/\./g) || []).length;
      if (depth === 1) {
        heading = HeadingLevel.HEADING_1;
      } else if (depth === 2) {
        heading = HeadingLevel.HEADING_2;
      } else {
        heading = HeadingLevel.HEADING_3;
      }
    }

    // Create paragraph with appropriate styling
    if (heading) {
      paragraphs.push(
        new Paragraph({
          text: textContent,
          heading,
          spacing: {
            before: 240,
            after: 120,
          },
        }),
      );
    } else {
      // Regular paragraph
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(trimmedLine)],
          spacing: {
            before: 100,
            after: 100,
          },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
