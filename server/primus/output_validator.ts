/**
 * Output Validator & Sanitizer for Primus GFS Document Generator
 *
 * This module ensures that LLM-generated documents contain ONLY audit-ready content
 * with no meta-commentary, placeholders, or system messages.
 *
 * Key responsibilities:
 * 1. Detect forbidden patterns that indicate meta-content
 * 2. Sanitize accidental meta-text from output
 * 3. Validate mandatory section structure
 * 4. Provide clean, deterministic SOP documents
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  sanitizedOutput?: string;
}

export interface ValidationError {
  type:
    | "FORBIDDEN_PATTERN"
    | "MISSING_SECTION"
    | "INCOMPLETE_CONTENT"
    | "PLACEHOLDER_DETECTED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  message: string;
  context?: string; // Excerpt showing the problem
  lineNumber?: number;
}

export interface ValidationWarning {
  type: "SUSPICIOUS_CONTENT" | "FORMATTING_ISSUE" | "LENGTH_CONCERN";
  message: string;
  context?: string;
}

// ============================================================================
// FORBIDDEN PATTERNS (META-CONTENT DETECTION)
// ============================================================================

/**
 * Forbidden patterns that indicate the LLM is generating meta-commentary
 * instead of actual SOP content. These patterns trigger regeneration.
 */
const FORBIDDEN_PATTERNS: Array<{
  pattern: RegExp;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}> = [
  // Bracketed meta-comments
  {
    pattern: /\[\.{3,}\]/gi,
    description: "Ellipsis brackets indicating omitted content",
    severity: "CRITICAL",
  },
  {
    pattern: /\[…\]/gi,
    description: "Ellipsis character in brackets",
    severity: "CRITICAL",
  },
  {
    pattern: /\[continued\s+as\s+per\s+template\]/gi,
    description: "Continuation placeholder",
    severity: "CRITICAL",
  },
  {
    pattern: /\[the\s+full\s+document\s+would\s+continue\]/gi,
    description: "Document continuation note",
    severity: "CRITICAL",
  },
  {
    pattern: /\[similar\s+to\s+above\]/gi,
    description: "Reference to previous content",
    severity: "CRITICAL",
  },
  {
    pattern: /\[repeat\s+for\s+each\]/gi,
    description: "Repetition instruction",
    severity: "CRITICAL",
  },
  {
    pattern: /\[insert\s+\w+\s+here\]/gi,
    description: "Insertion instruction",
    severity: "CRITICAL",
  },
  {
    pattern: /\[fill\s+in\]/gi,
    description: "Fill-in instruction",
    severity: "CRITICAL",
  },
  {
    pattern: /\[tbd\]/gi,
    description: "To be determined placeholder",
    severity: "HIGH",
  },
  { pattern: /\[todo\]/gi, description: "Todo placeholder", severity: "HIGH" },
  {
    pattern: /\[pending\]/gi,
    description: "Pending status indicator",
    severity: "HIGH",
  },
  {
    pattern: /\[see\s+section\s+\d+\]/gi,
    description: "Cross-reference instruction",
    severity: "MEDIUM",
  },

  // Compliance auto-correction announcements
  {
    pattern: /COMPLIANCE\s+AUTO[-\s]?CORRECTION/gi,
    description: "Auto-correction announcement",
    severity: "CRITICAL",
  },
  {
    pattern: /\[COMPLIANCE\s+AUTO\]/gi,
    description: "Bracketed compliance message",
    severity: "CRITICAL",
  },
  {
    pattern: /missing\s+requirement\(s\)\s+added/gi,
    description: "Missing requirement notice",
    severity: "CRITICAL",
  },
  {
    pattern: /AUTO[-\s]?INJECTED/gi,
    description: "Auto-injection notice",
    severity: "CRITICAL",
  },

  // AI/LLM meta-commentary
  {
    pattern: /would\s+you\s+like\s+me\s+to/gi,
    description: "LLM asking for permission",
    severity: "CRITICAL",
  },
  {
    pattern: /I\s+can\s+help\s+you/gi,
    description: "LLM offering help",
    severity: "CRITICAL",
  },
  {
    pattern: /I\s+have\s+generated/gi,
    description: "LLM describing its action",
    severity: "CRITICAL",
  },
  {
    pattern: /I\s+will\s+now\s+create/gi,
    description: "LLM announcing creation",
    severity: "CRITICAL",
  },
  {
    pattern: /Here\s+is\s+the\s+(complete|final|revised)/gi,
    description: "LLM presenting output",
    severity: "CRITICAL",
  },
  {
    pattern: /The\s+following\s+document/gi,
    description: "LLM introducing document",
    severity: "HIGH",
  },
  {
    pattern: /This\s+document\s+has\s+been\s+generated/gi,
    description: "Generation statement",
    severity: "CRITICAL",
  },
  {
    pattern: /key\s+integrations\s+include/gi,
    description: "LLM listing integrations",
    severity: "CRITICAL",
  },
  {
    pattern: /note\s+that\s+this\s+document/gi,
    description: "LLM adding notes about document",
    severity: "HIGH",
  },

  // Explanations instead of content
  {
    pattern: /EXPLANATION:/gi,
    description: "Explanation header",
    severity: "CRITICAL",
  },
  {
    pattern: /Note:\s*The\s+SOP/gi,
    description: "Notes about the SOP",
    severity: "CRITICAL",
  },
  {
    pattern: /Important:\s*This/gi,
    description: "Important notices about generation",
    severity: "HIGH",
  },
  {
    pattern: /Please\s+note:/gi,
    description: "Notice to reader",
    severity: "HIGH",
  },

  // Template/variable references
  {
    pattern: /\{\{[^}]+\}\}/g,
    description: "Unfilled template variable",
    severity: "HIGH",
  },
  {
    pattern: /\$\{[^}]+\}/g,
    description: "JavaScript template literal",
    severity: "HIGH",
  },
  {
    pattern: /%[A-Z_]+%/g,
    description: "Environment variable placeholder",
    severity: "MEDIUM",
  },

  // Content about content (meta-descriptions)
  {
    pattern: /The\s+full\s+document\s+would\s+include/gi,
    description: "Description of what should be included",
    severity: "CRITICAL",
  },
  {
    pattern: /Additional\s+sections\s+would\s+cover/gi,
    description: "Description of omitted sections",
    severity: "CRITICAL",
  },
  {
    pattern: /This\s+section\s+should\s+contain/gi,
    description: "Description instead of content",
    severity: "CRITICAL",
  },
  {
    pattern: /Below\s+is\s+a\s+comprehensive/gi,
    description: "LLM introducing comprehensive document",
    severity: "HIGH",
  },

  // First-person references (in non-quote context)
  {
    pattern: /^I\s+(have|will|am|should)\s+/gim,
    description: "First-person statement",
    severity: "CRITICAL",
  },
  {
    pattern: /\bwe\s+can\s+see\s+that/gi,
    description: "Analytical first-person plural",
    severity: "HIGH",
  },

  // POST-SIGNATURE CONTENT (NEW - CRITICAL)
  // These patterns indicate content appearing after the document should have ended
  {
    pattern: /CHEMICAL\s+COMPLIANCE:/gi,
    description: "Post-signature compliance content",
    severity: "CRITICAL",
  },
  {
    pattern: /PEST\s+CONTROL\s+COMPLIANCE:/gi,
    description: "Post-signature pest compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /PEST\s+COMPLIANCE:/gi,
    description: "Post-signature pest compliance short form",
    severity: "CRITICAL",
  },
  {
    pattern: /DOCUMENT\s+CONTROL\s+COMPLIANCE:/gi,
    description: "Post-signature document control compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /GLASS.*COMPLIANCE:/gi,
    description: "Post-signature glass compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /HACCP\s+COMPLIANCE:/gi,
    description: "Post-signature HACCP compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /TRACEABILITY\s+COMPLIANCE:/gi,
    description: "Post-signature traceability compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /ALLERGEN\s+COMPLIANCE:/gi,
    description: "Post-signature allergen compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /PROGRAM\s+COMPLIANCE/gi,
    description: "Post-signature program compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /COMPLIANCE\s+SUMMARY/gi,
    description: "Post-signature compliance summary",
    severity: "CRITICAL",
  },
  {
    pattern: /ADDITIONAL\s+COMPLIANCE/gi,
    description: "Post-signature additional compliance",
    severity: "CRITICAL",
  },
  {
    pattern: /APPENDIX\s+[A-Z]/gi,
    description: "Appendix after signatures",
    severity: "CRITICAL",
  },
  {
    pattern: /NOTES:\s*$/gim,
    description: "Notes section after signatures",
    severity: "HIGH",
  },
  {
    pattern: /ADDITIONAL\s+NOTES/gi,
    description: "Additional notes after signatures",
    severity: "HIGH",
  },
];

/**
 * Suspicious patterns that might indicate poor quality but aren't immediate failures
 */
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /e\.g\.,\s*"?[A-Z][^"]*"?/g,
    description: "Example given instead of actual value",
  },
  { pattern: /such\s+as\s+\[/gi, description: 'Bracket after "such as"' },
  {
    pattern: /including\s+but\s+not\s+limited\s+to/gi,
    description: "Generic open-ended list",
  },
  {
    pattern: /\(as\s+applicable\)/gi,
    description: "Conditional applicability phrase",
  },
  { pattern: /\(if\s+any\)/gi, description: "Conditional existence phrase" },
  {
    pattern: /per\s+facility\s+procedures/gi,
    description: "Vague reference to other procedures",
  },
  { pattern: /N\/A/g, description: "Not applicable markers" },
];

// ============================================================================
// MANDATORY SECTION STRUCTURE
// ============================================================================

/**
 * Sections that MUST appear in every Primus GFS SOP document
 * Order matters for validation
 */
const MANDATORY_SECTIONS = [
  {
    number: 1,
    title: "Title & Document Control",
    alternates: ["Document Control", "Title"],
  },
  {
    number: 2,
    title: "Purpose / Objective",
    alternates: ["Purpose", "Objective"],
  },
  { number: 3, title: "Scope", alternates: [] },
  {
    number: 4,
    title: "Definitions & Abbreviations",
    alternates: ["Definitions", "Abbreviations"],
  },
  {
    number: 5,
    title: "Roles & Responsibilities",
    alternates: ["Responsibilities", "Roles"],
  },
  {
    number: 6,
    title: "Prerequisites & Reference Documents",
    alternates: ["Prerequisites", "Reference Documents", "References"],
  },
  {
    number: 7,
    title: "Hazard / Risk Analysis",
    alternates: ["Hazard Analysis", "Risk Analysis"],
  },
  { number: 8, title: "Procedures", alternates: [] },
  { number: 9, title: "Monitoring Plan", alternates: ["Monitoring"] },
  {
    number: 10,
    title: "Verification & Validation Activities",
    alternates: ["Verification", "Validation Activities"],
  },
  {
    number: 11,
    title: "Corrective & Preventive Action",
    alternates: ["Corrective Action", "Preventive Action", "CAPA Protocol"],
  },
  {
    number: 12,
    title: "Traceability & Recall Elements",
    alternates: ["Traceability", "Recall Elements"],
  },
  {
    number: 13,
    title: "Record Retention & Document Control",
    alternates: ["Record Retention", "Records"],
  },
  { number: 14, title: "Compliance Crosswalk", alternates: ["Crosswalk"] },
  {
    number: 15,
    title: "Revision History & Approval Signatures",
    alternates: ["Revision History", "Approval Signatures"],
  },
];

/**
 * Quick check for forbidden patterns only (no structure validation)
 * Use this during retry loop to catch meta-commentary without rejecting incomplete documents
 */
export function checkForbiddenPatternsOnly(output: string): {
  hasForbiddenPatterns: boolean;
  forbiddenPatterns: string[];
} {
  const patterns: string[] = [];

  // Only check the most critical patterns that indicate meta-commentary
  const criticalPatterns = FORBIDDEN_PATTERNS.filter(
    (p) =>
      p.severity === "CRITICAL" &&
      (p.description.includes("LLM") ||
        p.description.includes("meta-") ||
        p.description.includes("auto-correction") ||
        p.description.includes("ellipsis")),
  );

  for (const { pattern, description } of criticalPatterns) {
    if (pattern.test(output)) {
      patterns.push(description);
    }
  }

  return {
    hasForbiddenPatterns: patterns.length > 0,
    forbiddenPatterns: patterns,
  };
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

/**
 * Validate LLM output for forbidden patterns and structural requirements
 * Returns validation result with errors, warnings, and sanitized output
 */
export function validateLLMOutput(output: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Step 1: Check for post-signature content (CRITICAL)
  if (hasPostSignatureContent(output)) {
    errors.push({
      type: "FORBIDDEN_PATTERN",
      severity: "CRITICAL",
      message:
        "Post-signature content detected (compliance summaries, appendices, or notes after final signature)",
      context: 'Content found after "Approved By:" signature line',
    });
  }

  // Step 2: Check for forbidden patterns
  const forbiddenPatternErrors = detectForbiddenPatterns(output);
  errors.push(...forbiddenPatternErrors);

  // Step 3: Check for suspicious patterns (warnings only)
  const suspiciousWarnings = detectSuspiciousPatterns(output);
  warnings.push(...suspiciousWarnings);

  // Step 4: Validate mandatory section structure
  const structureErrors = validateSectionStructure(output);
  errors.push(...structureErrors);

  // Step 5: Check for incomplete content indicators
  const incompletenessErrors = detectIncompleteContent(output);
  errors.push(...incompletenessErrors);

  // Step 6: Sanitize output (remove minor issues that can be auto-fixed)
  let sanitizedOutput = sanitizeOutput(output);

  // Step 7: Apply signature cutoff (ALWAYS, even if validation passed)
  sanitizedOutput = cutoffAfterSignatures(sanitizedOutput);

  // Determine if valid (no critical or high severity errors)
  const criticalErrors = errors.filter(
    (e) => e.severity === "CRITICAL" || e.severity === "HIGH",
  );
  const valid = criticalErrors.length === 0;

  return {
    valid,
    errors,
    warnings,
    sanitizedOutput: valid ? sanitizedOutput : undefined,
  };
}

// ============================================================================
// PATTERN DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect forbidden patterns in output
 */
function detectForbiddenPatterns(output: string): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { pattern, description, severity } of FORBIDDEN_PATTERNS) {
    const matches = Array.from(output.matchAll(pattern));

    for (const match of matches) {
      const context = extractContext(output, match.index!);
      const lineNumber = getLineNumber(output, match.index!);

      errors.push({
        type: "FORBIDDEN_PATTERN",
        severity,
        message: `Forbidden pattern detected: ${description}`,
        context,
        lineNumber,
      });
    }
  }

  return errors;
}

/**
 * Detect suspicious patterns (warnings)
 */
function detectSuspiciousPatterns(output: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const { pattern, description } of SUSPICIOUS_PATTERNS) {
    const matches = Array.from(output.matchAll(pattern));

    for (const match of matches) {
      const context = extractContext(output, match.index!);

      warnings.push({
        type: "SUSPICIOUS_CONTENT",
        message: `Suspicious pattern: ${description}`,
        context,
      });
    }
  }

  return warnings;
}

/**
 * Validate that all mandatory sections are present
 */
function validateSectionStructure(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const outputLower = output.toLowerCase();

  for (const section of MANDATORY_SECTIONS) {
    const allTitles = [section.title, ...section.alternates];
    const found = allTitles.some((title) => {
      // Check for section number + title (e.g., "8. Procedures")
      const withNumber = `${section.number}. ${title.toLowerCase()}`;
      const withNumberAlt = `${section.number}\\. ${title.toLowerCase()}`;
      return (
        outputLower.includes(withNumber) ||
        new RegExp(withNumberAlt, "i").test(outputLower)
      );
    });

    if (!found) {
      errors.push({
        type: "MISSING_SECTION",
        severity: "HIGH",
        message: `Mandatory section missing: ${section.number}. ${section.title}`,
      });
    }
  }

  return errors;
}

/**
 * Detect incomplete content indicators
 */
function detectIncompleteContent(output: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = output.split("\n");

  // Check for sections with no content (section header followed by another section header)
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();

    // Is this a section header?
    if (/^\d+\.\s+[A-Z]/.test(line)) {
      // Is the next non-empty line also a section header?
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") {
        j++;
      }
      if (j < lines.length && /^\d+\.\s+[A-Z]/.test(lines[j].trim())) {
        errors.push({
          type: "INCOMPLETE_CONTENT",
          severity: "HIGH",
          message: `Section appears to have no content: ${line}`,
          context: line,
          lineNumber: i + 1,
        });
      }
    }
  }

  // Check document length (should be substantial for audit-ready SOP)
  // Lower threshold to 1000 words to reduce false rejections
  const wordCount = output.split(/\s+/).length;
  if (wordCount < 1000) {
    errors.push({
      type: "INCOMPLETE_CONTENT",
      severity: "CRITICAL",
      message: `Document too short (${wordCount} words). Audit-ready SOPs require comprehensive content (minimum 1000 words).`,
    });
  } else if (wordCount < 1500) {
    // Warning for documents under 1500 words (not an error)
    // This will show up but won't block generation
  }

  return errors;
}

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize output by removing or fixing minor issues
 * This is applied AFTER validation to clean up the output
 *
 * Important: This does NOT fix critical errors. Those require regeneration.
 * This only cleans up minor formatting and residual artifacts.
 */
export function sanitizeOutput(output: string): string {
  let sanitized = output;

  // Remove any stray markdown code fences
  sanitized = sanitized.replace(/```[\w]*\n?/g, "");

  // Remove multiple consecutive blank lines (more than 2)
  sanitized = sanitized.replace(/\n{4,}/g, "\n\n\n");

  // Remove leading/trailing whitespace
  sanitized = sanitized.trim();

  // Remove any XML-like tags that might have leaked
  sanitized = sanitized.replace(/<\/?[a-z]+>/gi, "");

  // Remove common markdown artifacts
  sanitized = sanitized.replace(/\*\*\*/g, ""); // Bold+italic markers
  sanitized = sanitized.replace(/~~(.+?)~~/g, "$1"); // Strikethrough

  // Clean up spacing around section headers
  sanitized = sanitized.replace(/(\d+\.\s+[^\n]+)\n{1}(?=\n)/g, "$1\n\n");

  // Remove any JSON-like structures at the beginning or end
  sanitized = sanitized.replace(/^\s*\{[^}]*"[^"]*":\s*"[^"]*"[^}]*\}\s*/g, "");
  sanitized = sanitized.replace(/\s*\{[^}]*"[^"]*":\s*"[^"]*"[^}]*\}\s*$/g, "");

  return sanitized;
}

/**
 * Aggressive sanitization for auto-correction artifacts
 * Use this to strip out compliance auto-correction messages and headers
 */
export function stripComplianceAnnotations(output: string): string {
  let cleaned = output;

  // Remove bracketed compliance messages and everything between them
  cleaned = cleaned.replace(/\[COMPLIANCE AUTO-CORRECTION:[^\]]*\]/gi, "");

  // Remove ALL "XYZ COMPLIANCE:" headers (these are auto-injected, not part of SOP)
  cleaned = cleaned.replace(/\n\n[A-Z][A-Z\s]+COMPLIANCE:\s*\n/g, "\n\n");
  cleaned = cleaned.replace(/^[A-Z][A-Z\s]+COMPLIANCE:\s*\n/gm, "");

  // Remove category requirement headers
  cleaned = cleaned.replace(/\n[A-Z_\s]+REQUIREMENTS:\s*\n/g, "\n");

  // Remove lines that are pure announcements (start with brackets)
  cleaned = cleaned.replace(/^\[.*\]\s*$/gm, "");

  // Clean up any resulting multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * CRITICAL: Cut off any content appearing after the final signature block
 * This ensures the document ends exactly at "Approved By: ______ Date: ______"
 * and prevents post-signature compliance summaries or appendices
 *
 * UPDATED: Only cuts if there's CLEARLY FORBIDDEN content after signatures
 * to prevent premature truncation of valid document content
 */
export function cutoffAfterSignatures(output: string): string {
  // Find all three signature lines (Prepared By, Reviewed By, Approved By)
  const signatureBlockPattern =
    /Approved\s+By:\s*[_\s]*(?:\w+\s*)*Date:\s*[_\s]*(?:__+)?/gi;
  const matches = Array.from(output.matchAll(signatureBlockPattern));

  if (matches.length === 0) {
    // No signature found - return as-is
    return output;
  }

  // Get the last "Approved By:" match
  const lastMatch = matches[matches.length - 1];
  const signatureEndIndex = lastMatch.index! + lastMatch[0].length;

  // Get content after signature
  const afterSignature = output.slice(signatureEndIndex);

  // Only cut if after-signature content contains FORBIDDEN patterns
  // Otherwise, let it be (might be part of the document)
  const forbiddenPostSigPatterns = [
    /CHEMICAL\s+COMPLIANCE:/gi,
    /PEST\s+(CONTROL\s+)?COMPLIANCE:/gi,
    /DOCUMENT\s+CONTROL\s+COMPLIANCE:/gi,
    /GLASS.*COMPLIANCE:/gi,
    /HACCP\s+COMPLIANCE:/gi,
    /TRACEABILITY\s+COMPLIANCE:/gi,
    /ALLERGEN\s+COMPLIANCE:/gi,
    /PROGRAM\s+COMPLIANCE/gi,
    /COMPLIANCE\s+SUMMARY/gi,
    /ADDITIONAL\s+COMPLIANCE/gi,
    /APPENDIX\s+[A-Z]:/gi,
    /\[COMPLIANCE\s+AUTO/gi,
    /missing\s+requirement.*added/gi,
  ];

  let hasForbiddenContent = false;
  for (const pattern of forbiddenPostSigPatterns) {
    if (pattern.test(afterSignature)) {
      hasForbiddenContent = true;
      break;
    }
  }

  if (hasForbiddenContent) {
    console.log(
      `[CUTOFF] ✂️ Removing ${afterSignature.length} chars of post-signature forbidden content`,
    );
    // Find a clean cutoff point (after signature line ends)
    const cleanCutoff = output.slice(0, signatureEndIndex).trimEnd();
    return cleanCutoff;
  }

  // No forbidden content - return as-is
  return output;
}

/**
 * Detect if output contains post-signature content
 * Returns true if forbidden patterns appear after the signature block
 */
export function hasPostSignatureContent(output: string): boolean {
  // Find the last "Approved By:" position
  const approvedByPattern = /Approved\s+By:/gi;
  const matches = Array.from(output.matchAll(approvedByPattern));

  if (matches.length === 0) {
    return false; // Can't determine without signature
  }

  const lastMatch = matches[matches.length - 1];
  const afterSignature = output.slice(lastMatch.index!);

  // Check for forbidden post-signature patterns
  const postSigPatterns = [
    /CHEMICAL\s+COMPLIANCE:/gi,
    /PEST\s+(CONTROL\s+)?COMPLIANCE:/gi,
    /DOCUMENT\s+CONTROL\s+COMPLIANCE:/gi,
    /GLASS.*COMPLIANCE:/gi,
    /HACCP\s+COMPLIANCE:/gi,
    /TRACEABILITY\s+COMPLIANCE:/gi,
    /ALLERGEN\s+COMPLIANCE:/gi,
    /PROGRAM\s+COMPLIANCE/gi,
    /COMPLIANCE\s+SUMMARY/gi,
    /ADDITIONAL\s+COMPLIANCE/gi,
    /APPENDIX\s+[A-Z]/gi,
    /ADDITIONAL\s+NOTES/gi,
    /\n\n[A-Z\s]+REQUIREMENTS:/gi, // Category headers like "PEST REQUIREMENTS:"
    /\n\n[A-Z\s]+COMPLIANCE:/gi, // Any "XYZ COMPLIANCE:" header
  ];

  for (const pattern of postSigPatterns) {
    if (pattern.test(afterSignature)) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract context around a match (for error reporting)
 */
function extractContext(
  text: string,
  index: number,
  contextLength = 100,
): string {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + contextLength);
  const excerpt = text.slice(start, end);

  return (start > 0 ? "..." : "") + excerpt + (end < text.length ? "..." : "");
}

/**
 * Get line number for a character index
 */
function getLineNumber(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/**
 * Format validation result as human-readable report
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push("=".repeat(80));
  lines.push("DOCUMENT VALIDATION REPORT");
  lines.push("=".repeat(80));
  lines.push("");
  lines.push(`Status: ${result.valid ? "✅ VALID" : "❌ INVALID"}`);
  lines.push(`Errors: ${result.errors.length}`);
  lines.push(`Warnings: ${result.warnings.length}`);
  lines.push("");

  if (result.errors.length > 0) {
    lines.push("ERRORS:");
    lines.push("-".repeat(80));
    for (const error of result.errors) {
      lines.push(`[${error.severity}] ${error.message}`);
      if (error.context) {
        lines.push(`  Context: ${error.context}`);
      }
      if (error.lineNumber) {
        lines.push(`  Line: ${error.lineNumber}`);
      }
      lines.push("");
    }
  }

  if (result.warnings.length > 0) {
    lines.push("WARNINGS:");
    lines.push("-".repeat(80));
    for (const warning of result.warnings) {
      lines.push(`[${warning.type}] ${warning.message}`);
      if (warning.context) {
        lines.push(`  Context: ${warning.context}`);
      }
      lines.push("");
    }
  }

  lines.push("=".repeat(80));

  return lines.join("\n");
}

/**
 * Quick validation check (returns boolean only)
 */
export function isValidOutput(output: string): boolean {
  const result = validateLLMOutput(output);
  return result.valid;
}

/**
 * Get only critical errors (for retry logic)
 */
export function getCriticalErrors(result: ValidationResult): ValidationError[] {
  return result.errors.filter(
    (e) => e.severity === "CRITICAL" || e.severity === "HIGH",
  );
}
