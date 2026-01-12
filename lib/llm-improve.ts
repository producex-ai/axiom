import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION! });

// Compliance document sections with metadata
interface ComplianceSection {
  id: number;
  name: string;
  priority: "high" | "medium" | "low";
  description: string;
  isBatchable?: boolean; // For low-priority sections that can be combined
}

const COMPLIANCE_SECTIONS: ComplianceSection[] = [
  {
    id: 1,
    name: "Title & Document Control",
    priority: "low",
    description:
      "Document title, version, effective date, document number, and change history",
    isBatchable: true,
  },
  {
    id: 2,
    name: "Purpose / Objective",
    priority: "high",
    description: "Clear statement of the document's purpose and business objectives",
  },
  {
    id: 3,
    name: "Scope",
    priority: "high",
    description: "Define what is covered and what is excluded from this procedure",
  },
  {
    id: 4,
    name: "Definitions & Abbreviations",
    priority: "low",
    description: "Key terms, definitions, and acronyms used in the document",
    isBatchable: true,
  },
  {
    id: 5,
    name: "Roles & Responsibilities",
    priority: "high",
    description: "Define who is responsible for each key activity and decision",
  },
  {
    id: 6,
    name: "Prerequisites & Reference Documents",
    priority: "medium",
    description: "Prerequisites, related procedures, regulatory references",
    isBatchable: true,
  },
  {
    id: 7,
    name: "Hazard / Risk Analysis",
    priority: "high",
    description: "Identify and analyze potential hazards and associated risks",
  },
  {
    id: 8,
    name: "Procedures (Detailed Step-by-Step)",
    priority: "high",
    description: "Detailed, implementable procedures with clear steps and instructions",
  },
  {
    id: 9,
    name: "Monitoring Plan",
    priority: "high",
    description:
      "How procedures will be monitored, including frequency, methods, and responsibility",
  },
  {
    id: 10,
    name: "Verification & Validation Activities",
    priority: "high",
    description: "Activities to verify procedures are working correctly",
  },
  {
    id: 11,
    name: "Corrective & Preventive Action (CAPA) Protocol",
    priority: "high",
    description: "How to address non-conformances and prevent recurrence",
  },
  {
    id: 12,
    name: "Traceability & Recall Elements",
    priority: "high",
    description: "Systems to trace products and execute recalls if needed",
  },
  {
    id: 13,
    name: "Record Retention & Document Control",
    priority: "medium",
    description: "What records are maintained, how long, and access controls",
    isBatchable: true,
  },
  {
    id: 14,
    name: "Compliance Crosswalk (Primus Mapping)",
    priority: "high",
    description: "Mapping of procedures to specific Primus GFS requirements",
  },
  {
    id: 15,
    name: "Revision History & Approval Signatures",
    priority: "low",
    description: "Document version history and approval signatures",
    isBatchable: true,
  },
];

/**
 * Helper: Sleep function for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a section with retry logic and timeout protection
 */
async function generateSectionWithRetry(
  params: Parameters<typeof generateSection>[0],
  maxRetries = 2,
  timeout = 45000,
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        generateSection(params),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Section ${params.section.id} generation timeout`)),
            timeout,
          ),
        ),
      ]);
      return result;
    } catch (error) {
      console.error(
        `[LLM-IMPROVE] ⚠️ Section ${params.section.id} attempt ${attempt + 1} failed:`,
        error instanceof Error ? error.message : error,
      );

      if (attempt === maxRetries - 1) {
        console.error(
          `[LLM-IMPROVE] ❌ Section ${params.section.id} failed after ${maxRetries} attempts`,
        );
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = Math.pow(2, attempt) * 1000;
      console.log(
        `[LLM-IMPROVE] 🔄 Retrying section ${params.section.id} in ${delay}ms...`,
      );
      await sleep(delay);
    }
  }
  throw new Error(`Section ${params.section.id} generation failed`);
}

/**
 * Validate generated section content
 */
function validateSection(section: {
  id: number;
  name: string;
  content: string;
}): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check minimum length (at least 100 characters)
  if (section.content.length < 100) {
    issues.push(`Section ${section.id} is too short (${section.content.length} chars)`);
  }

  // Check for placeholder text
  const placeholders = [
    "[TO BE COMPLETED]",
    "[TBD]",
    "[INSERT]",
    "[Content not available]",
  ];
  for (const placeholder of placeholders) {
    if (section.content.includes(placeholder)) {
      issues.push(`Section ${section.id} contains placeholder: ${placeholder}`);
    }
  }

  // Check if section starts with proper number
  if (!section.content.trim().startsWith(`${section.id}.`)) {
    issues.push(`Section ${section.id} missing proper section number`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Pre-compute evidence cache for all sections to avoid redundant processing
 */
function precomputeEvidenceCache(
  sections: ComplianceSection[],
  documents: { fileName: string; text: string }[],
  checklist: any,
): Map<number, string> {
  console.log("[LLM-IMPROVE] Pre-computing evidence cache for all sections...");
  const cache = new Map<number, string>();

  for (const section of sections) {
    const evidence = extractRelevantEvidence(section, documents, checklist);
    cache.set(section.id, evidence);
  }

  console.log(`[LLM-IMPROVE] ✅ Evidence cache ready (${cache.size} sections)`);
  return cache;
}

/**
 * Generate a complete, professional compliance document section-by-section
 * Each section is generated in a separate LLM call to avoid token limits
 * @param existingDocuments - Original uploaded documents for context
 * @param checklist - Compliance checklist requirements
 * @param missingRequirements - Identified gaps from analysis
 * @param coverageMap - Mapping of requirement coverage
 * @returns Complete compliance document as formatted text
 */
export async function improveDocument({
  existingDocuments,
  checklist,
  missingRequirements,
  coverageMap,
}: {
  existingDocuments: { fileName: string; text: string }[];
  checklist: any;
  missingRequirements: any[];
  coverageMap: Record<string, "covered" | "partial" | "missing">;
}): Promise<string> {
  console.log(
    "[LLM-IMPROVE] Starting section-by-section document generation...",
  );

  // Step 1: Generate document metadata
  console.log("[LLM-IMPROVE] Generating document metadata...");
  const metadata = await generateDocumentMetadata({
    existingDocuments,
    checklist,
  });

  // Step 2: Pre-compute evidence cache to avoid redundant processing
  const evidenceCache = precomputeEvidenceCache(
    COMPLIANCE_SECTIONS,
    existingDocuments,
    checklist,
  );

  const sections: Array<{ id: number; name: string; content: string }> = [];
  
  // Separate sections by priority for optimal batching
  const highPrioritySections = COMPLIANCE_SECTIONS.filter(s => s.priority === "high");
  const mediumLowSections = COMPLIANCE_SECTIONS.filter(s => s.priority !== "high");

  // Generate high-priority sections IN PARALLEL for maximum speed
  console.log(
    `[LLM-IMPROVE] Generating ${highPrioritySections.length} high-priority sections in parallel...`,
  );
  
  const highPriorityPromises = highPrioritySections.map((section) =>
    generateSectionWithRetry({
      section,
      existingDocuments,
      checklist,
      missingRequirements,
      coverageMap,
      evidenceCache,
    }).then((content) => ({
      id: section.id,
      name: section.name,
      content,
    })),
  );

  const highPriorityResults = await Promise.all(highPriorityPromises);
  sections.push(...highPriorityResults);

  console.log(
    `[LLM-IMPROVE] ✅ ${highPriorityResults.length} high-priority sections completed in parallel`,
  );

  // Generate medium/low priority sections in optimized batch
  if (mediumLowSections.length > 0) {
    console.log(
      `[LLM-IMPROVE] Generating ${mediumLowSections.length} medium/low priority sections in batch...`,
    );
    try {
      const batchedContents = await generateBatchedSections({
        sections: mediumLowSections,
        existingDocuments,
        checklist,
        missingRequirements,
        coverageMap,
        evidenceCache,
      });

      sections.push(...batchedContents);
      console.log(
        `[LLM-IMPROVE] ✅ ${mediumLowSections.length} batched sections completed`,
      );
    } catch (error) {
      console.error(
        `[LLM-IMPROVE] ❌ Error generating batched sections, falling back to parallel generation...`,
        error,
      );
      
      // Fallback: generate in parallel if batch fails
      const fallbackPromises = mediumLowSections.map((section) =>
        generateSectionWithRetry({
          section,
          existingDocuments,
          checklist,
          missingRequirements,
          coverageMap,
          evidenceCache,
        }).then((content) => ({
          id: section.id,
          name: section.name,
          content,
        })).catch((e) => {
          console.error(`[LLM-IMPROVE] ❌ Failed to generate section ${section.id}:`, e);
          return {
            id: section.id,
            name: section.name,
            content: `${section.id}. ${section.name}\n\n[Section generation failed - please review manually]`,
          };
        }),
      );
      
      const fallbackResults = await Promise.all(fallbackPromises);
      sections.push(...fallbackResults);
    }
  }

  // Step 3: Validate all sections
  console.log("[LLM-IMPROVE] Validating generated sections...");
  const validationResults = sections.map(validateSection);
  const invalidSections = validationResults.filter((r) => !r.valid);

  if (invalidSections.length > 0) {
    console.warn(
      `[LLM-IMPROVE] ⚠️ ${invalidSections.length} sections have validation issues:`,
    );
    invalidSections.forEach((result) => {
      console.warn(`  - ${result.issues.join(", ")}`);
    });
  } else {
    console.log("[LLM-IMPROVE] ✅ All sections validated successfully");
  }

  // Step 4: Assemble final document
  console.log("[LLM-IMPROVE] Assembling final document...");
  const finalDocument = assembleFinalDocument({
    metadata,
    sections,
    existingDocuments,
  });

  console.log(
    `[LLM-IMPROVE] ✅ Document generation complete (${finalDocument.length} chars)`,
  );
  return finalDocument;
}

/**
 * Generate document metadata (title, version, dates, owner)
 */
async function generateDocumentMetadata({
  existingDocuments,
  checklist,
}: {
  existingDocuments: { fileName: string; text: string }[];
  checklist: any;
}): Promise<{
  title: string;
  docNumber: string;
  version: string;
  effectiveDate: string;
  owner: string;
  purpose: string;
}> {
  const documentSummary = existingDocuments
    .map((doc, i) => `${i + 1}. ${doc.fileName}`)
    .join("\n");

  const prompt = `You are a compliance document expert. Generate metadata for a Primus GFS compliance document.

UPLOADED DOCUMENTS:
${documentSummary}

REQUIREMENTS SUMMARY:
${typeof checklist === "string" ? checklist : JSON.stringify(checklist).substring(0, 1000)}

Generate the following in JSON format (ONLY JSON, no explanation):
{
  "title": "Professional document title",
  "docNumber": "DOC-XXXX-YY format",
  "version": "1.0",
  "effectiveDate": "YYYY-MM-DD",
  "owner": "Department or role responsible",
  "purpose": "One sentence purpose statement"
}`;

  const response = await callBedrock(prompt, 1000);
  const jsonMatch = response.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return {
      title: "Compliance Procedure Document",
      docNumber: `DOC-${Date.now()}`,
      version: "1.0",
      effectiveDate: new Date().toISOString().split("T")[0],
      owner: "[TO BE COMPLETED]",
      purpose:
        "This document describes compliance procedures and requirements.",
    };
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return {
      title: "Compliance Procedure Document",
      docNumber: `DOC-${Date.now()}`,
      version: "1.0",
      effectiveDate: new Date().toISOString().split("T")[0],
      owner: "[TO BE COMPLETED]",
      purpose:
        "This document describes compliance procedures and requirements.",
    };
  }
}

/**
 * Generate a single compliance section with priority-based token limits
 */
async function generateSection({
  section,
  existingDocuments,
  checklist,
  missingRequirements,
  coverageMap,
  evidenceCache,
}: {
  section: ComplianceSection;
  existingDocuments: { fileName: string; text: string }[];
  checklist: any;
  missingRequirements: any[];
  coverageMap: Record<string, "covered" | "partial" | "missing">;
  evidenceCache?: Map<number, string>;
}): Promise<string> {
  // Determine token limit based on section priority (balanced for completeness and speed)
  const tokenLimits: Record<string, number> = {
    high: 2000,
    medium: 1000,
    low: 600,
  };
  const maxTokens = tokenLimits[section.priority] || 1000;

  // Use cached evidence if available, otherwise extract
  const relevantEvidence = evidenceCache?.get(section.id) ??
    extractRelevantEvidence(
      section,
      existingDocuments,
      checklist,
    );

  // Filter relevant checklist items for this section
  const relevantRequirements = filterRequirementsForSection(
    section,
    checklist,
    missingRequirements,
  );

  const prompt = buildSectionPrompt({
    section,
    relevantEvidence,
    relevantRequirements,
    coverageMap,
  });

  const content = await callBedrock(prompt, maxTokens);

  // Clean up the response
  let cleanedContent = content
    .replace(/^```[a-z]*\n?/gm, "")
    .replace(/\n?```$/gm, "")
    .trim();

  // Ensure section number is included
  if (!cleanedContent.startsWith(`${section.id}.`)) {
    cleanedContent = `${section.id}. ${section.name}\n\n${cleanedContent}`;
  }

  return cleanedContent;
}

/**
 * Generate multiple low-priority sections in a single batch call
 */
async function generateBatchedSections({
  sections,
  existingDocuments,
  checklist,
  missingRequirements,
  coverageMap,
  evidenceCache,
}: {
  sections: ComplianceSection[];
  existingDocuments: { fileName: string; text: string }[];
  checklist: any;
  missingRequirements: any[];
  coverageMap: Record<string, "covered" | "partial" | "missing">;
  evidenceCache?: Map<number, string>;
}): Promise<Array<{ id: number; name: string; content: string }>> {
  // Build batch prompt for all sections
  const sectionPrompts = sections
    .map(
      (section) => `
## Section ${section.id}: ${section.name}
${section.description}
`,
    )
    .join("\n");

  const prompt = `You are a professional compliance document writer specializing in Primus GFS certification.

TASK: Generate the following compliance document sections CONCISELY. Each section should be 300-500 words maximum.

${sectionPrompts}

CRITICAL INSTRUCTIONS:
1. Write CONCISE, PROFESSIONAL sections - NO document headers or titles
2. DO NOT use markdown bold syntax (**) - write plain text only
3. For field labels use plain text: "Document Number:" not "Document Number: **"
4. Use bullet points and tables to reduce verbosity
5. Focus on essential information only - eliminate fluff
6. Each section should be standalone and audit-ready
7. Include specific procedures, frequencies, responsibilities
8. Use formal compliance language
9. Keep medium priority to 0.5-1 page, low priority to 0.25-0.5 page
10. Do NOT include template placeholders or [TO BE COMPLETED]
11. DO NOT create full document titles within sections
12. Be direct and actionable - avoid unnecessary explanations

FORMAT YOUR RESPONSE EXACTLY AS:
--- SECTION_START: [id] ---
[Section content in plain text without ** formatting]
--- SECTION_END: [id] ---

Start now:`;

  const batchContent = await callBedrock(prompt, 2500);

  // Parse batched response
  const results: Array<{ id: number; name: string; content: string }> = [];

  for (const section of sections) {
    const sectionRegex = new RegExp(
      `--- SECTION_START: ${section.id} ---([\\s\\S]*?)--- SECTION_END: ${section.id} ---`,
      "i",
    );
    const match = batchContent.match(sectionRegex);

    if (match) {
      let content = match[1].trim();
      if (!content.startsWith(`${section.id}.`)) {
        content = `${section.id}. ${section.name}\n\n${content}`;
      }
      results.push({
        id: section.id,
        name: section.name,
        content,
      });
    } else {
      // Fallback if parsing fails
      console.warn(
        `[LLM-IMPROVE] Could not parse section ${section.id} from batch response`,
      );
      results.push({
        id: section.id,
        name: section.name,
        content: `${section.id}. ${section.name}\n\n[Content not available]`,
      });
    }
  }

  return results;
}

/**
 * Call Bedrock API with error handling and token limit awareness
 */
async function callBedrock(prompt: string, maxTokens: number): Promise<string> {
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }),
  );

  const responseBody = JSON.parse(
    new TextDecoder().decode(response.body),
  );

  // Check for truncation and warn with more details
  if (responseBody.stop_reason === "max_tokens") {
    console.warn(
      `[LLM-IMPROVE] ⚠️ Response truncated at ${maxTokens} tokens. Consider reducing prompt size or increasing token limit.`,
    );
    
    // Return what we have - the content is still usable
    const truncatedContent = responseBody.content[0].text;
    
    // Add ellipsis if content doesn't end with punctuation
    if (!/[.!?]\s*$/.test(truncatedContent.trim())) {
      return truncatedContent + "...";
    }
    
    return truncatedContent;
  }

  return responseBody.content[0].text;
}

/**
 * Extract relevant evidence from documents for a specific section
 */
function extractRelevantEvidence(
  section: ComplianceSection,
  documents: { fileName: string; text: string }[],
  checklist: any,
): string {
  const keywords = getKeywordsForSection(section, checklist);
  const evidence: string[] = [];

  for (const doc of documents) {
    const lines = doc.text.split("\n");
    const relevantLines = lines.filter((line) =>
      keywords.some((keyword) =>
        line.toLowerCase().includes(keyword.toLowerCase()),
      ),
    );

    if (relevantLines.length > 0) {
      const excerpt = relevantLines.slice(0, 5).join("\n");
      if (excerpt.length > 0) {
        evidence.push(
          `From ${doc.fileName}:\n${excerpt}\n---`,
        );
      }
    }
  }

  // Truncate to 1000 chars for faster LLM processing
  return evidence.length > 0
    ? evidence.join("\n\n").substring(0, 1000)
    : "No specific evidence found for this section.";
}

/**
 * Get keywords for a section to extract relevant evidence
 */
function getKeywordsForSection(
  section: ComplianceSection,
  checklist: any,
): string[] {
  const keywordMap: Record<string, string[]> = {
    "Title & Document Control": [
      "document",
      "version",
      "control",
      "approval",
      "date",
    ],
    "Purpose / Objective": [
      "purpose",
      "objective",
      "goal",
      "mission",
      "intent",
    ],
    Scope: ["scope", "applies", "includes", "excludes", "coverage"],
    "Definitions & Abbreviations": [
      "define",
      "definition",
      "abbreviation",
      "acronym",
      "term",
    ],
    "Roles & Responsibilities": [
      "role",
      "responsibility",
      "owner",
      "manager",
      "responsible",
    ],
    "Prerequisites & Reference Documents": [
      "prerequisite",
      "reference",
      "requirement",
      "standard",
      "procedure",
    ],
    "Hazard / Risk Analysis": [
      "hazard",
      "risk",
      "analysis",
      "assess",
      "danger",
      "mitigation",
    ],
    "Procedures (Detailed Step-by-Step)": [
      "procedure",
      "step",
      "process",
      "instruction",
      "how to",
      "method",
    ],
    "Monitoring Plan": [
      "monitor",
      "frequency",
      "check",
      "inspect",
      "verification",
      "testing",
    ],
    "Verification & Validation Activities": [
      "verify",
      "validation",
      "verify",
      "confirm",
      "test",
      "audit",
    ],
    "Corrective & Preventive Action (CAPA) Protocol": [
      "corrective",
      "preventive",
      "capa",
      "action",
      "issue",
      "nonconformance",
    ],
    "Traceability & Recall Elements": [
      "trace",
      "traceability",
      "recall",
      "batch",
      "lot",
      "track",
    ],
    "Record Retention & Document Control": [
      "record",
      "retention",
      "document",
      "control",
      "archive",
      "storage",
    ],
    "Compliance Crosswalk (Primus Mapping)": [
      "primus",
      "compliance",
      "mapping",
      "requirement",
      "standard",
      "gfs",
    ],
    "Revision History & Approval Signatures": [
      "revision",
      "history",
      "approval",
      "signature",
      "author",
      "date",
    ],
  };

  return keywordMap[section.name] || [
    section.name.toLowerCase().split(" ")[0],
  ];
}

/**
 * Filter checklist requirements relevant to a section
 */
function filterRequirementsForSection(
  section: ComplianceSection,
  checklist: any,
  missingRequirements: any[],
): string {
  const sectionKeywords = getKeywordsForSection(section, checklist);

  let relevantReqs: any[] = [];

  if (Array.isArray(checklist)) {
    relevantReqs = checklist.filter((req: any) =>
      sectionKeywords.some(
        (kw) =>
          (typeof req === "string"
            ? req.toLowerCase()
            : JSON.stringify(req).toLowerCase()
          ).includes(kw.toLowerCase()),
      ),
    );
  } else if (typeof checklist === "string") {
    relevantReqs = sectionKeywords.map((kw) => ({
      description: kw,
    }));
  }

  return relevantReqs.length > 0
    ? relevantReqs.slice(0, 5).map((r) => `- ${JSON.stringify(r)}`).join("\n")
    : "General compliance requirements for this section.";
}

/**
 * Build the prompt for generating a section with conciseness emphasis
 */
function buildSectionPrompt({
  section,
  relevantEvidence,
  relevantRequirements,
  coverageMap,
}: {
  section: ComplianceSection;
  relevantEvidence: string;
  relevantRequirements: string;
  coverageMap: Record<string, "covered" | "partial" | "missing">;
}): string {
  const pageGuidance =
    section.priority === "high"
      ? "Keep this section to 1-2 pages."
      : section.priority === "medium"
        ? "Keep this section to 1 page."
        : "Keep this section concise - under 0.5 pages.";

  return `You are a professional compliance document writer specializing in Primus GFS certification.

TASK: Write Section ${section.id} - ${section.name}

SECTION DESCRIPTION:
${section.description}

RELEVANT EVIDENCE FROM UPLOADED DOCUMENTS:
${relevantEvidence}

APPLICABLE REQUIREMENTS:
${relevantRequirements}

CRITICAL INSTRUCTIONS:
1. Write ONLY the section content for "${section.name}" - DO NOT create a full document header
2. DO NOT write document titles like "FOOD SAFETY MANAGEMENT SYSTEM MANUAL" or similar
3. DO NOT use markdown bold syntax with ** - write plain text only
4. Start directly with section number: ${section.id}. ${section.name}
5. ${pageGuidance}
6. Use information from the uploaded evidence where available
7. Use bullet points, tables, and numbered lists instead of long paragraphs
8. Include specific procedures, frequencies, and responsibilities
9. Use formal compliance/audit language
10. Do NOT include template placeholders or [TO BE COMPLETED]
11. Reference relevant requirements where applicable
12. Eliminate redundant information - be direct and precise
13. For field labels (like "Document Number:"), use plain text without bold markers

OUTPUT FORMAT:
${section.id}. ${section.name}

[Write concise section content without document headers or markdown formatting]

Start writing now:`;
}

/**
 * Assemble all sections into a final document
 */
function assembleFinalDocument({
  metadata,
  sections,
  existingDocuments,
}: {
  metadata: {
    title: string;
    docNumber: string;
    version: string;
    effectiveDate: string;
    owner: string;
    purpose: string;
  };
  sections: Array<{ id: number; name: string; content: string }>;
  existingDocuments: { fileName: string; text: string }[];
}): string {
  // Sort sections by ID to ensure correct order
  const sortedSections = [...sections].sort((a, b) => a.id - b.id);

  // Clean and normalize section content
  const cleanedSections = sortedSections.map((section) => ({
    ...section,
    content: cleanSectionContent(section.content),
  }));

  const docDate = new Date();
  const documentHeader = `=====================================
${metadata.title}
=====================================

Document Number: ${metadata.docNumber}
Version: ${metadata.version}
Effective Date: ${metadata.effectiveDate}
Owner/Department: ${metadata.owner}
Generated: ${docDate.toISOString()}

PURPOSE:
${metadata.purpose}

DOCUMENT INFORMATION:
This compliance document was generated using AI assistance based on uploaded evidence documents.
All sections have been professionally formatted and reviewed for compliance readiness.
This document is intended to serve as a complete compliance procedure manual suitable for
third-party audit and certification.

EVIDENCE DOCUMENTS USED:
${existingDocuments.map((d) => `- ${d.fileName}`).join("\n")}

=====================================
TABLE OF CONTENTS
=====================================
${cleanedSections.map((s) => `${s.id}. ${s.name}`).join("\n")}

=====================================
DOCUMENT SECTIONS
=====================================

`;

  const sectionsContent = cleanedSections
    .map(
      (s) => `
${s.content}

`,
    )
    .join("\n" + "=".repeat(50) + "\n\n");

  const footerSignatures = `
=====================================
APPROVAL & SIGNATURES
=====================================

Document Title: ${metadata.title}
Document Number: ${metadata.docNumber}
Version: ${metadata.version}
Effective Date: ${metadata.effectiveDate}

APPROVAL SIGNATURES:

Author/Prepared By:
Name: _____________________
Title: _____________________
Date: _____________________
Signature: _____________________

Reviewed By:
Name: _____________________
Title: _____________________
Date: _____________________
Signature: _____________________

Approved By:
Name: _____________________
Title: _____________________
Date: _____________________
Signature: _____________________

=====================================
REVISION HISTORY
=====================================

Version | Date | Author | Changes
--------|------|--------|--------
${metadata.version} | ${metadata.effectiveDate} | AI Assistant | Initial document generation

=====================================
END OF DOCUMENT
=====================================`;

  return documentHeader + sectionsContent + footerSignatures;
}

/**
 * Clean and normalize section content from LLM output
 * Removes markdown formatting, extra asterisks, and improves formatting
 */
function cleanSectionContent(content: string): string {
  let cleaned = content;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```[a-z]*\n?/gm, "").replace(/\n?```$/gm, "");

  // Remove leading # symbols (markdown headers)
  cleaned = cleaned.replace(/^#+\s+/gm, "");

  // Clean up ALL double asterisks (markdown bold syntax)
  // Remove ** before field names: "**Field Name:" -> "Field Name:"
  cleaned = cleaned.replace(/^\*\*([^*]+):\s*/gm, "$1: ");
  
  // Remove ** after colons: "Field: **" -> "Field:"
  cleaned = cleaned.replace(/:\s*\*\*\s*/g, ": ");
  
  // Remove ** in list items: "- **Item:**" -> "- Item:"
  cleaned = cleaned.replace(/^- \*\*([^*]+):\*\*\s*/gm, "- $1: ");
  
  // Remove ** around words: "**text**" -> "text"
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  
  // Remove standalone ** or multiple asterisks
  cleaned = cleaned.replace(/\*\*+/g, "");

  // Normalize spacing around colons
  cleaned = cleaned.replace(/:\s+/g, ": ");

  // Remove multiple blank lines
  cleaned = cleaned.replace(/\n\n\n+/g, "\n\n");

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

