import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION! });

// Standard Primus GFS document sections (in order)
const PRIMUS_STANDARD_SECTIONS = [
  "TITLE & DOCUMENT CONTROL",
  "PURPOSE / OBJECTIVE",
  "SCOPE",
  "DEFINITIONS & ABBREVIATIONS",
  "ROLES & RESPONSIBILITIES",
  "PREREQUISITES & REFERENCE DOCUMENTS",
  "PROCEDURES",
  "HAZARD / RISK ANALYSIS",
  "MONITORING PLAN",
  "CORRECTIVE & PREVENTIVE ACTION (CAPA) PROTOCOL",
  "VERIFICATION & VALIDATION ACTIVITIES",
  "RECORD RETENTION & DOCUMENT CONTROL",
  "TRACEABILITY & RECORD LINKAGES",
  "COMPLIANCE CROSSWALK",
  "REVISION HISTORY & APPROVAL SIGNATURES",
];

interface Document {
  fileName: string;
  text: string;
}

interface MergedSection {
  section: string;
  content: string;
}

/**
 * Merge multiple Primus GFS documents into one audit-ready document
 * This is the main entry point - keeps same signature as original
 */
export async function mergeDocuments(
  documents: { fileName: string; text: string }[],
): Promise<string> {
  // ===== VALIDATION =====
  if (!documents || documents.length === 0) {
    console.error("[MERGE] ❌ No documents provided");
    throw new Error("No documents provided for merging");
  }

  const validDocuments = documents.filter((doc) => {
    if (!doc.fileName || !doc.text) {
      console.warn("[MERGE] ⚠️ Skipping invalid document (missing fileName or text)");
      return false;
    }
    if (doc.text.trim().length < 100) {
      console.warn(`[MERGE] ⚠️ Document "${doc.fileName}" too short (${doc.text.length} chars)`);
      return false;
    }
    return true;
  });

  if (validDocuments.length === 0) {
    console.error("[MERGE] ❌ No valid documents to merge");
    throw new Error("No valid documents to merge");
  }

  console.log(`[MERGE] 🚀 Starting merge of ${validDocuments.length} documents`);
  const totalSize = validDocuments.reduce((sum, doc) => sum + doc.text.length, 0);
  console.log(`[MERGE] 📊 Total content: ${totalSize.toLocaleString()} characters`);

  // ===== STEP 1: DETECT SECTIONS =====
  console.log("\n[MERGE] 📋 STEP 1: Analyzing document structure...");
  const detectedSections = await analyzeDocumentStructure(validDocuments);
  
  if (!detectedSections || detectedSections.length === 0) {
    console.error("[MERGE] ❌ No sections detected");
    throw new Error("Could not detect document structure");
  }

  console.log(`[MERGE] ✅ Detected ${detectedSections.length} sections`);

  // ===== STEP 2: MERGE SECTIONS =====
  console.log("\n[MERGE] 🔄 STEP 2: Merging sections...");
  const mergedSections = await mergeSectionBySection(validDocuments, detectedSections);
  
  console.log(`[MERGE] ✅ Successfully merged ${mergedSections.length} sections`);

  // ===== STEP 3: ASSEMBLE FINAL DOCUMENT =====
  console.log("\n[MERGE] 📝 STEP 3: Assembling final document...");
  const finalDocument = assembleMergedDocument(mergedSections);

  console.log(`\n[MERGE] 🎉 MERGE COMPLETE!`);
  console.log(`[MERGE] 📄 Final document: ${finalDocument.length.toLocaleString()} characters`);
  console.log(`[MERGE] 📑 Sections included: ${mergedSections.length}`);

  return finalDocument;
}

/**
 * STEP 1: Analyze document structure and detect sections
 * Uses intelligent multi-strategy approach
 */
async function analyzeDocumentStructure(documents: Document[]): Promise<string[]> {
  const detectedSections = new Set<string>();

  // STRATEGY 1: Look for numbered sections (MOST RELIABLE)
  // Format: "1. TITLE & DOCUMENT CONTROL"
  console.log("[MERGE] 🔍 Strategy 1: Scanning for numbered sections...");
  
  for (const doc of documents) {
    const lines = doc.text.split("\n");
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(/^(\d+)\.\s+(.+)$/);
      
      if (match) {
        const sectionName = match[2].trim();
        
        // Validate it's a real section header
        if (isValidSectionHeader(sectionName, lines, i)) {
          detectedSections.add(sectionName);
          console.log(`[MERGE] ✓ Found: "${sectionName}"`);
        }
      }
    }
  }

  if (detectedSections.size > 0) {
    console.log(`[MERGE] ✅ Strategy 1 SUCCESS: ${detectedSections.size} sections`);
    return sortSectionsByStandardOrder(Array.from(detectedSections));
  }

  // STRATEGY 2: Look for standard Primus sections (case-insensitive)
  console.log("[MERGE] 🔍 Strategy 2: Looking for standard Primus sections...");
  
  for (const doc of documents) {
    const textLower = doc.text.toLowerCase();
    
    for (const standardSection of PRIMUS_STANDARD_SECTIONS) {
      const sectionLower = standardSection.toLowerCase();
      
      // Look for the section with various formats
      const patterns = [
        new RegExp(`^\\d+\\.\\s*${escapeRegex(standardSection)}`, "im"),
        new RegExp(`^${escapeRegex(standardSection)}\\s*$`, "im"),
        new RegExp(`^${escapeRegex(standardSection)}\\s*\n[-=]{3,}`, "im"),
      ];
      
      if (patterns.some(pattern => pattern.test(doc.text))) {
        detectedSections.add(standardSection);
        console.log(`[MERGE] ✓ Found: "${standardSection}"`);
      }
    }
  }

  if (detectedSections.size > 0) {
    console.log(`[MERGE] ✅ Strategy 2 SUCCESS: ${detectedSections.size} sections`);
    return sortSectionsByStandardOrder(Array.from(detectedSections));
  }

  // STRATEGY 3: Use LLM to intelligently detect sections
  console.log("[MERGE] 🤖 Strategy 3: Using AI to analyze structure...");
  
  try {
    const llmSections = await detectSectionsWithLLM(documents);
    
    if (llmSections.length > 0) {
      console.log(`[MERGE] ✅ Strategy 3 SUCCESS: ${llmSections.length} sections`);
      return sortSectionsByStandardOrder(llmSections);
    }
  } catch (error) {
    console.error("[MERGE] ⚠️ LLM strategy failed:", error);
  }

  // STRATEGY 4: Handle completely unstructured documents
  console.log("[MERGE] 🔍 Strategy 4: Checking for unstructured documents...");
  
  const hasAnyStructure = documents.some(doc => 
    doc.text.match(/^\d+\.\s+[A-Z]/m) || // Numbered headers
    doc.text.match(/^[A-Z\s&/(),-]{15,}$/m) || // All-caps headers
    doc.text.match(/^#{1,3}\s+/m) // Markdown headers
  );

  if (!hasAnyStructure) {
    console.log("[MERGE] ⚠️ No structure detected in documents");
    console.log("[MERGE] 📝 Documents appear to be unstructured text");
    console.log("[MERGE] 🤖 AI will intelligently organize the content");
    return await handleUnstructuredDocuments(documents);
  }

  // FALLBACK: Use most common Primus sections
  console.log("[MERGE] ⚠️ Using default Primus sections (fallback)");
  return [
    "TITLE & DOCUMENT CONTROL",
    "PURPOSE / OBJECTIVE",
    "SCOPE",
    "DEFINITIONS & ABBREVIATIONS",
    "ROLES & RESPONSIBILITIES",
    "PROCEDURES",
    "MONITORING PLAN",
    "RECORD RETENTION & DOCUMENT CONTROL",
  ];
}

/**
 * Validate if a line is truly a section header (not a procedural step)
 */
function isValidSectionHeader(sectionName: string, lines: string[], currentIndex: number): boolean {
  // Must be substantial length
  if (sectionName.length < 10 || sectionName.length > 100) {
    return false;
  }

  // Must be mostly uppercase (section headers are typically all caps)
  const upperCaseRatio = (sectionName.match(/[A-Z]/g) || []).length / sectionName.replace(/\s/g, '').length;
  if (upperCaseRatio < 0.5) {
    return false;
  }

  // Check if it matches a known Primus section (fuzzy match)
  const isKnownSection = PRIMUS_STANDARD_SECTIONS.some(standard => 
    sectionName.toUpperCase().includes(standard.toUpperCase().substring(0, 10)) ||
    standard.toUpperCase().includes(sectionName.toUpperCase().substring(0, 10))
  );

  // Must have content following it (not just another header immediately)
  const hasContent = hasSubstantialContentAfter(lines, currentIndex + 1, 3);

  return isKnownSection || hasContent;
}

/**
 * Check if there's actual content after a potential header
 */
function hasSubstantialContentAfter(lines: string[], startIndex: number, minLines: number): boolean {
  let contentLines = 0;
  
  for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip blank lines and separators
    if (line === "" || line.match(/^[-=]{3,}$/)) {
      continue;
    }
    
    // Stop if we hit another numbered section
    if (line.match(/^\d+\.\s+[A-Z]/)) {
      break;
    }
    
    // Count substantial content lines (not just single words)
    if (line.length > 10) {
      contentLines++;
    }
    
    if (contentLines >= minLines) {
      return true;
    }
  }
  
  return false;
}

/**
 * Handle documents with NO structure (no headers at all)
 * Uses LLM to intelligently organize content into sections
 */
async function handleUnstructuredDocuments(documents: Document[]): Promise<string[]> {
  console.log("[MERGE] 🤖 Using AI to organize unstructured content...");

  // For unstructured documents, we'll create a special "FULL CONTENT" section
  // that the LLM will organize intelligently during the merge step
  return ["MERGED DOCUMENT CONTENT"];
}

/**
 * Use LLM to detect sections when pattern matching fails
 */
async function detectSectionsWithLLM(documents: Document[]): Promise<string[]> {
  const docPreviews = documents
    .map((doc, i) => `DOCUMENT ${i + 1}: ${doc.fileName}\n${doc.text.substring(0, 1500)}\n...`)
    .join("\n\n" + "=".repeat(80) + "\n\n");

  const prompt = `Analyze these Primus GFS compliance documents and identify the MAIN section headers.

STANDARD PRIMUS SECTIONS (for reference):
${PRIMUS_STANDARD_SECTIONS.join(", ")}

DOCUMENTS TO ANALYZE:
${docPreviews}

TASK:
1. Identify ALL main section headers present in the documents
2. Focus on major sections, NOT subsections or bullet points
3. Look for numbered sections (e.g., "1. TITLE & DOCUMENT CONTROL")
4. Only include sections that have actual content

Return ONLY a JSON array of section names found. Example:
["TITLE & DOCUMENT CONTROL", "PURPOSE / OBJECTIVE", "SCOPE", "PROCEDURES"]

Detected sections:`;

  const response = await callBedrock(prompt, 1500);
  const jsonMatch = response.match(/\[[\s\S]*?\]/);

  if (jsonMatch) {
    const sections = JSON.parse(jsonMatch[0]);
    if (Array.isArray(sections) && sections.length > 0) {
      return sections.filter(s => typeof s === "string" && s.length > 0);
    }
  }

  return [];
}

/**
 * STEP 2: Merge sections one by one
 */
async function mergeSectionBySection(
  documents: Document[],
  sections: string[],
): Promise<MergedSection[]> {
  const mergedSections: MergedSection[] = [];
  const skippedSections: string[] = [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const progress = `[${i + 1}/${sections.length}]`;

    console.log(`\n[MERGE] ${progress} Processing: "${section}"`);

    try {
      const mergedContent = await mergeSingleSection(documents, section);

      // Validate merged content
      if (mergedContent && mergedContent.trim().length >= 30) {
        mergedSections.push({ section, content: mergedContent });
        console.log(`[MERGE] ✅ ${progress} Success (${mergedContent.length} chars)`);
      } else {
        skippedSections.push(section);
        console.log(`[MERGE] ⚠️ ${progress} Skipped (insufficient content)`);
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[MERGE] ❌ ${progress} Error:`, error);
      skippedSections.push(section);
    }
  }

  if (skippedSections.length > 0) {
    console.log(`\n[MERGE] ⚠️ Skipped ${skippedSections.length} sections with no content`);
  }

  return mergedSections;
}

/**
 * Merge a single section from all documents
 */
async function mergeSingleSection(documents: Document[], sectionName: string): Promise<string> {
  // Extract content for this section from each document
  const sectionContents = documents
    .map(doc => ({
      fileName: doc.fileName,
      content: extractSectionContent(doc.text, sectionName),
    }))
    .filter(item => item.content && item.content.length >= 30);

  // No content found
  if (sectionContents.length === 0) {
    console.log(`[MERGE] ℹ️ No content found for "${sectionName}"`);
    return "";
  }

  // Only one document has this section - use it directly
  if (sectionContents.length === 1) {
    console.log(`[MERGE] ℹ️ Single source for "${sectionName}"`);
    return cleanMergedContent(sectionContents[0].content);
  }

  // Multiple sources - need intelligent merging
  console.log(`[MERGE] 🔄 Merging "${sectionName}" from ${sectionContents.length} sources...`);

  const prompt = buildMergePrompt(sectionName, sectionContents);
  const mergedContent = await callBedrock(prompt, 2500);

  const cleaned = cleanMergedContent(mergedContent);

  // Detect and log conflicts
  detectConflicts(cleaned, sectionName);

  return cleaned;
}

/**
 * Extract section content from document text
 */
function extractSectionContent(text: string, sectionName: string): string {
  // Special case: Unstructured documents
  if (sectionName === "MERGED DOCUMENT CONTENT") {
    console.log(`[MERGE] ℹ️ Extracting full content (unstructured document)`);
    return text.trim();
  }

  const lines = text.split("\n");
  const result: string[] = [];
  let inSection = false;
  let contentLineCount = 0;
  const MAX_LINES = 300;

  const normalizedSection = sectionName.toLowerCase().trim();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    // Check if this is our target section
    const isTargetSection =
      // Numbered format: "1. SECTION NAME"
      (line.match(/^\d+\.\s+/) && lower.includes(normalizedSection)) ||
      // Direct match (with or without number)
      lower === normalizedSection ||
      lower.replace(/^\d+\.\s*/, '') === normalizedSection;

    if (isTargetSection && !inSection) {
      inSection = true;
      // Skip header and separator if present
      if (i + 1 < lines.length && lines[i + 1].match(/^[-=]{3,}$/)) {
        i++;
      }
      continue;
    }

    if (inSection) {
      // Stop at next section (numbered header or major all-caps header)
      const isNextSection =
        line.match(/^\d+\.\s+[A-Z]/) ||
        (trimmed.match(/^[A-Z\s&/(),-]{15,}$/) && 
         contentLineCount > 5 &&
         i + 1 < lines.length && 
         (lines[i + 1].trim() === "" || lines[i + 1].match(/^[-=]{3,}$/)));

      if (isNextSection) {
        break;
      }

      result.push(line);
      contentLineCount++;

      if (contentLineCount > MAX_LINES) {
        console.log(`[MERGE] ⚠️ Section "${sectionName}" truncated at ${MAX_LINES} lines`);
        break;
      }
    }
  }

  // Clean up leading/trailing empty lines
  while (result.length > 0 && result[0].trim() === "") {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }

  return result.join("\n").trim();
}

/**
 * Build intelligent merge prompt
 */
function buildMergePrompt(
  section: string,
  contents: Array<{ fileName: string; content: string }>,
): string {
  // Special case: Unstructured documents
  if (section === "MERGED DOCUMENT CONTENT") {
    return buildUnstructuredMergePrompt(contents);
  }

  const sourceText = contents
    .map((item, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE ${i + 1}: ${item.fileName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.content}
`)
    .join("\n");

  return `You are an expert in merging Primus GFS compliance documentation. Your task is to merge the "${section}" section from multiple source documents into ONE comprehensive, audit-ready section.

${sourceText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MERGING INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL RULES:
1. ELIMINATE ALL REDUNDANCY - If multiple sources say the same thing, include it ONCE
2. PRESERVE ALL UNIQUE INFORMATION - Every distinct requirement must be included
3. MAINTAIN COMPLETENESS - Don't summarize away important details
4. USE PROFESSIONAL FORMATTING - Clear structure with bullet points where appropriate

HANDLING CONFLICTS:
When sources have different values for the same requirement:
- Use the more recent/stringent requirement
- Mark with: [Updated from <old value>]
- Examples:
  * "Update within 7 days [Updated from 30-day requirement]"
  * "5 committee members [Updated from 3-member requirement]"

OUTPUT REQUIREMENTS:
✓ Output ONLY the merged section content
✓ NO explanatory text, notes, or meta-commentary
✓ NO phrases like "Note:", "However:", "The above", "This section"
✓ Professional compliance document format
✓ Complete and ready for audit

Begin merged "${section}" section:`;
}

/**
 * Build merge prompt for unstructured documents
 */
function buildUnstructuredMergePrompt(
  contents: Array<{ fileName: string; content: string }>,
): string {
  const sourceText = contents
    .map((item, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCE ${i + 1}: ${item.fileName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${item.content}
`)
    .join("\n");

  return `You are merging multiple compliance documents that lack clear section headers. Your task is to create ONE well-organized, comprehensive document.

${sourceText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MERGING INSTRUCTIONS FOR UNSTRUCTURED CONTENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL TASKS:
1. Intelligently organize the content into logical sections
2. ELIMINATE ALL REDUNDANCY - include each piece of information ONCE
3. PRESERVE ALL UNIQUE INFORMATION from all sources
4. Create clear structure with appropriate headers and formatting
5. Merge complementary information coherently

SUGGESTED STRUCTURE (adapt as needed based on content):
• Overview/Introduction
• Main Requirements/Procedures
• Roles and Responsibilities
• Monitoring/Verification
• Records and Documentation
• Additional Information

HANDLING CONFLICTS:
When sources have different values:
- Use the more recent/stringent requirement
- Mark with: [Updated from <old value>]

OUTPUT REQUIREMENTS:
✓ Well-organized with clear section headers
✓ Professional compliance document format
✓ NO meta-commentary or explanatory notes
✓ Complete and ready for audit

Begin merged document:`;
}

/**
 * Clean merged content - remove artifacts and format properly
 */
function cleanMergedContent(content: string): string {
  let cleaned = content;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/```[\w]*\n?/g, "").replace(/\n?```/g, "");

  // Remove ALL meta-commentary patterns
  const metaPatterns = [
    /^\s*Note:.*$/gim,
    /^\s*\[Note:.*?\]\s*$/gim,
    /^\s*The above.*$/gim,
    /^\s*This section.*$/gim,
    /^\s*This merged.*$/gim,
    /^\s*Here is.*$/gim,
    /^\s*I've.*$/gim,
    /^\s*Content has been.*$/gim,
    /would you like.*$/gim,
  ];

  metaPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/[ \t]+$/gm, ""); // Remove trailing spaces

  return cleaned.trim();
}

/**
 * Detect conflicts in merged content
 */
function detectConflicts(content: string, section: string): void {
  const conflictPattern = /\[Updated from[^\]]*\]/gi;
  const matches = content.match(conflictPattern);

  if (matches && matches.length > 0) {
    console.log(`[MERGE] ⚠️ CONFLICTS DETECTED in "${section}": ${matches.length} conflict(s)`);
    matches.forEach((conflict, i) => {
      console.log(`[MERGE]    ${i + 1}. ${conflict}`);
    });
  }
}

/**
 * STEP 3: Assemble final merged document
 */
function assembleMergedDocument(sections: MergedSection[]): string {
  // Filter out any sections that ended up empty
  const validSections = sections.filter(s => s.content && s.content.trim().length > 20);

  // Special case: Unstructured document (single merged content section)
  if (validSections.length === 1 && validSections[0].section === "MERGED DOCUMENT CONTENT") {
    return assembleUnstructuredDocument(validSections[0].content);
  }

  // Build table of contents
  const toc = validSections
    .map((s, i) => `${i + 1}. ${s.section}`)
    .join("\n");

  const header = `${"=".repeat(70)}
PRIMUS GFS COMPLIANCE DOCUMENT - MERGED
${"=".repeat(70)}

Document Type: Standard Operating Procedure (SOP)
Generated: ${new Date().toISOString()}
Status: MERGED DRAFT - Requires Review and Approval

${"=".repeat(70)}
TABLE OF CONTENTS
${"=".repeat(70)}
${toc}

${"=".repeat(70)}
DOCUMENT CONTENT
${"=".repeat(70)}
`;

  const content = validSections
    .map((s, i) => {
      return `

${i + 1}. ${s.section}
${"-".repeat(70)}

${s.content}
`;
    })
    .join("\n");

  const footer = `

${"=".repeat(70)}
END OF DOCUMENT
${"=".repeat(70)}

IMPORTANT NOTICE:
This document was generated by merging multiple source documents.
Please review carefully to ensure:
  ✓ All information is accurate and current
  ✓ No unresolved conflicts remain
  ✓ All regulatory requirements are met
  ✓ Document is approved before use

Generated: ${new Date().toLocaleString()}
`;

  return header + content + footer;
}

/**
 * Assemble document from unstructured content
 */
function assembleUnstructuredDocument(content: string): string {
  const header = `${"=".repeat(70)}
MERGED COMPLIANCE DOCUMENT
${"=".repeat(70)}

Document Type: Merged Document (Unstructured Sources)
Generated: ${new Date().toISOString()}
Status: MERGED DRAFT - Requires Review and Approval

${"=".repeat(70)}
DOCUMENT CONTENT
${"=".repeat(70)}

`;

  const footer = `

${"=".repeat(70)}
END OF DOCUMENT
${"=".repeat(70)}

IMPORTANT NOTICE:
This document was created by merging unstructured source documents.
The content has been intelligently organized by AI.
Please review carefully to ensure:
  ✓ All information is accurate and current
  ✓ Organization makes logical sense
  ✓ No unresolved conflicts remain
  ✓ Document is approved before use

Generated: ${new Date().toLocaleString()}
`;

  return header + content + footer;
}

/**
 * Sort sections by Primus standard order
 */
function sortSectionsByStandardOrder(sections: string[]): string[] {
  return sections.sort((a, b) => {
    const indexA = PRIMUS_STANDARD_SECTIONS.indexOf(a);
    const indexB = PRIMUS_STANDARD_SECTIONS.indexOf(b);

    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    return a.localeCompare(b);
  });
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rate limiter for Bedrock API
 */
const rateLimiter = {
  lastCallTime: 0,
  minDelayMs: 600,

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCallTime;
    if (elapsed < this.minDelayMs) {
      const delay = this.minDelayMs - elapsed;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    this.lastCallTime = Date.now();
  },
};

/**
 * Call Bedrock API with retry logic
 */
async function callBedrock(prompt: string, maxTokens: number): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.wait();

      const response = await bedrock.send(
        new InvokeModelCommand({
          modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: maxTokens,
            temperature: 0,
            messages: [{ role: "user", content: prompt }],
          }),
        }),
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      if (responseBody.stop_reason === "max_tokens") {
        console.warn(`[MERGE] ⚠️ Response truncated (max: ${maxTokens} tokens)`);
      }

      return responseBody.content[0].text;
    } catch (error) {
      const isThrottling = error instanceof Error && 
        (error.message.includes("ThrottlingException") || 
         error.message.includes("Too many requests") ||
         error.message.includes("429"));

      if (isThrottling && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[MERGE] ⚠️ Throttled, retrying in ${backoffMs}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }

      console.error("[MERGE] ❌ API call failed:", error);
      throw error;
    }
  }

  throw new Error("Max retries exceeded");
}