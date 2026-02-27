import { getPool } from "@/lib/db/postgres";
import type { JobTemplateWithFields, JobTemplateField } from "./jobTemplateService";

/**
 * Field mapping between document column and template field
 */
export interface FieldMapping {
  documentColumn: string;
  templateFieldKey: string;
  templateFieldLabel: string;
  fieldCategory: "creation" | "action";
  confidence: "high" | "medium" | "low";
}

/**
 * Validation result for extracted jobs
 */
export interface JobExtractionValidation {
  isValid: boolean;
  missingRequiredFields: string[];
  unmappedColumns: string[];
  warnings: string[];
}

/**
 * Mapped job ready for creation
 */
export interface MappedJob {
  index: number; // Original row index
  creation_field_values: Record<string, any>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Suggest field mappings between document columns and template fields
 * Uses fuzzy string matching for auto-suggestions
 */
export async function suggestFieldMappings(
  templateId: string,
  extractedColumns: string[],
  orgId: string
): Promise<FieldMapping[]> {
  const pool = getPool();

  // Get template fields - BOTH creation AND action fields
  const result = await pool.query<JobTemplateField>(
    `SELECT * FROM job_template_fields 
     WHERE template_id = $1
     ORDER BY field_category, display_order`,
    [templateId]
  );

  const templateFields = result.rows;
  const mappings: FieldMapping[] = [];
  const usedTemplateFieldKeys = new Set<string>(); // Track used template fields

  // Try to match each document column to a template field
  // Only allow one-to-one mapping (each template field can only be used once)
  for (const docColumn of extractedColumns) {
    const availableFields = templateFields.filter(
      (f) => !usedTemplateFieldKeys.has(f.field_key)
    );
    
    if (availableFields.length === 0) {
      // No more template fields available
      continue;
    }

    const bestMatch = findBestMatch(docColumn, availableFields);
    if (bestMatch) {
      mappings.push(bestMatch);
      usedTemplateFieldKeys.add(bestMatch.templateFieldKey);
    }
  }

  return mappings;
}

/**
 * Find best matching template field for a document column
 */
function findBestMatch(
  documentColumn: string,
  templateFields: JobTemplateField[]
): FieldMapping | null {
  const docColLower = documentColumn.toLowerCase().trim();
  const docColNormalized = normalizeString(docColLower);

  let bestMatch: {
    field: JobTemplateField;
    confidence: "high" | "medium" | "low";
  } | null = null;
  let bestScore = 0;

  for (const field of templateFields) {
    const fieldLabelLower = field.field_label.toLowerCase().trim();
    const fieldKeyLower = field.field_key.toLowerCase().trim();
    const fieldLabelNormalized = normalizeString(fieldLabelLower);
    const fieldKeyNormalized = normalizeString(fieldKeyLower);

    // Exact match (case-insensitive)
    if (
      docColLower === fieldLabelLower ||
      docColLower === fieldKeyLower ||
      docColNormalized === fieldLabelNormalized ||
      docColNormalized === fieldKeyNormalized
    ) {
      return {
        documentColumn,
        templateFieldKey: field.field_key,
        templateFieldLabel: field.field_label,
        fieldCategory: field.field_category,
        confidence: "high",
      };
    }

    // Contains match
    if (
      docColLower.includes(fieldLabelLower) ||
      fieldLabelLower.includes(docColLower) ||
      docColLower.includes(fieldKeyLower) ||
      fieldKeyLower.includes(docColLower)
    ) {
      const score = calculateSimilarityScore(docColLower, fieldLabelLower);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          field,
          confidence: score > 0.8 ? "high" : "medium",
        };
      }
    }

    // Fuzzy match using Levenshtein-like comparison
    const similarity = calculateSimilarityScore(
      docColNormalized,
      fieldLabelNormalized
    );
    if (similarity > 0.6 && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = {
        field,
        confidence: similarity > 0.8 ? "medium" : "low",
      };
    }
  }

  if (bestMatch && bestScore > 0.5) {
    return {
      documentColumn,
      templateFieldKey: bestMatch.field.field_key,
      templateFieldLabel: bestMatch.field.field_label,
      fieldCategory: bestMatch.field.field_category,
      confidence: bestMatch.confidence,
    };
  }

  return null;
}

/**
 * Normalize string for comparison (remove special chars, spaces, etc.)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Simple implementation using character overlap
 */
function calculateSimilarityScore(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  // Count matching characters
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }

  return matches / longer.length;
}

/**
 * Apply field mappings to extracted rows and validate
 */
export function applyFieldMappings(
  extractedRows: Array<Record<string, any>>,
  fieldMappings: FieldMapping[],
  template: JobTemplateWithFields
): MappedJob[] {
  const creationFields = template.fields.filter(
    (f) => f.field_category === "creation"
  );

  return extractedRows.map((row, index) => {
    const creation_field_values: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    // Apply mappings
    for (const mapping of fieldMappings) {
      const value = row[mapping.documentColumn];
      creation_field_values[mapping.templateFieldKey] = value;
    }

    // Validate required fields
    for (const field of creationFields) {
      if (field.is_required) {
        const value = creation_field_values[field.field_key];
        if (value === undefined || value === null || value === "") {
          errors.push(`Required field "${field.field_label}" is missing`);
        }
      }
    }

    // Check for unmapped required fields
    const mappedFieldKeys = fieldMappings.map((m) => m.templateFieldKey);
    const unmappedRequired = creationFields.filter(
      (f) => f.is_required && !mappedFieldKeys.includes(f.field_key)
    );

    if (unmappedRequired.length > 0) {
      for (const field of unmappedRequired) {
        errors.push(`Required field "${field.field_label}" has no mapping`);
      }
    }

    return {
      index,
      creation_field_values,
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  });
}

/**
 * Validate overall extraction against template
 */
export function validateExtraction(
  template: JobTemplateWithFields,
  extractedColumns: string[],
  fieldMappings: FieldMapping[]
): JobExtractionValidation {
  const creationFields = template.fields.filter(
    (f) => f.field_category === "creation"
  );

  const mappedFieldKeys = fieldMappings.map((m) => m.templateFieldKey);
  const mappedDocColumns = fieldMappings.map((m) => m.documentColumn);

  // Find missing required fields
  const missingRequiredFields = creationFields
    .filter((f) => f.is_required && !mappedFieldKeys.includes(f.field_key))
    .map((f) => f.field_label);

  // Find unmapped columns
  const unmappedColumns = extractedColumns.filter(
    (col) => !mappedDocColumns.includes(col)
  );

  // Generate warnings
  const warnings: string[] = [];

  if (unmappedColumns.length > 0) {
    warnings.push(
      `${unmappedColumns.length} column(s) from document are not mapped: ${unmappedColumns.join(", ")}`
    );
  }

  const lowConfidenceMappings = fieldMappings.filter(
    (m) => m.confidence === "low"
  );
  if (lowConfidenceMappings.length > 0) {
    warnings.push(
      `${lowConfidenceMappings.length} mapping(s) have low confidence. Please review.`
    );
  }

  return {
    isValid: missingRequiredFields.length === 0,
    missingRequiredFields,
    unmappedColumns,
    warnings,
  };
}

/**
 * Get unmapped template fields (creation fields without mapping)
 */
export function getUnmappedTemplateFields(
  template: JobTemplateWithFields,
  fieldMappings: FieldMapping[]
): JobTemplateField[] {
  const mappedFieldKeys = new Set(fieldMappings.map((m) => m.templateFieldKey));

  return template.fields.filter(
    (f) => f.field_category === "creation" && !mappedFieldKeys.has(f.field_key)
  );
}
