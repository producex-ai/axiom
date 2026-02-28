# Compliance Artifact Linking - Technical Design

## 1. Problem Statement

### Current Limitation
ComplianceDoc entities exist in isolation and cannot reference operational artifacts within the system. When compliance documentation describes procedures, processes, or requirements, there is no formal mechanism to link these documents to:

- **Job Templates** - Organization-level standardized job configurations that implement compliance procedures
- **Company Documents** - Supporting documentation, SOPs, policies, and procedures uploaded to specific sub-modules

This creates several issues:
- **Traceability Gap**: No way to track which artifacts support which compliance requirements
- **Maintenance Overhead**: When compliance docs reference procedures, updates must be manually propagated
- **Audit Challenges**: Auditors cannot easily verify that documented procedures have corresponding operational implementations
- **Context Loss**: Users viewing compliance docs cannot directly access referenced supporting materials
- **Cross-Reference Limitation**: Job Templates are org-level and not constrained by sub-modules, making it difficult to establish contextual relevance

### Business Impact
- Increased audit preparation time
- Risk of compliance-implementation drift
- Manual effort to maintain consistency between documentation and operations
- Difficulty demonstrating compliance through artifact traceability

---

## 2. Actual System Architecture Analysis

### Database Schema Investigation

**Key Findings from Codebase Analysis (February 2026):**

1. **ComplianceDoc (document table)**:
   - ✅ Exists with sub_module_id
   - Table: `document`
   - Relationship: 1:1 with sub-module (UNIQUE constraint)
   - Fields: `id`, `org_id`, `framework_id`, `module_id`, `sub_module_id`, `sub_sub_module_id`, `title`, `status`, `content_key`, `doc_type`, `current_version`, `analysis_score`, `published_at`, `renewal`
   
2. **JobTemplate (job_templates table)**:
   - ✅ Exists BUT has NO sub_module_id field
   - Table: `job_templates`
   - Relationship: 1:N with Organization (org-level only)
   - Fields: `id`, `name`, `category`, `description`, `version`, `active`, `doc_num`, `sop` (text reference, not FK), `org_id`, `created_by`, `created_at`, `updated_at`
   - Related tables: `job_template_fields`, `jobs`, `job_creation_values`, `job_actions`, `job_action_values`
   
3. **LogTemplate**:
   - ✅ Exists as log_templates table
   - Table: `log_templates`
   - Relationship: 1:N with Organization (org-level only)
   - Fields: `id`, `name`, `description`, `category`, `sop`, `template_type`, `items`, `org_id`, `created_by`, `created_at`, `updated_at`, `review_time`
   - Note: Used for daily log templates with task lists or field inputs
   
4. **CompanyDocument**:
   - ✅ Exists with sub_module_id
   - Table: Same `document` table as ComplianceDoc
   - Distinguished by: `doc_type = 'company'`
   - Relationship: 1:N with sub-module (multiple company docs per sub-module allowed)
   - Same fields as document table

**Architecture Impact:**
- JobTemplate links will be **org-level only** (cannot validate by sub_module_id)
- LogTemplate links will be **org-level only** (cannot validate by sub_module_id)
- CompanyDocument links can enforce **sub-module matching** (same as ComplianceDoc)
- Both ComplianceDoc and CompanyDocument share the `document` table

---

## 3. Current Architecture

### Existing Entity Relationships

**Actual Database Schema:**

```
Organization
    │
    ├── JobTemplate (1:N) [org-level, NO sub_module_id]
    │   ├── Table: job_templates
    │   ├── id: uuid
    │   ├── org_id: text
    │   ├── name: text
    │   ├── category: text
    │   ├── sop: text (reference only, not FK)
    │   ├── active: boolean
    │   └── [version, description, doc_num, audit fields]
    │
    ├── LogTemplate (1:N) [org-level, NO sub_module_id]
    │   ├── Table: log_templates
    │   ├── id: uuid
    │   ├── org_id: text
    │   ├── name: text
    │   ├── category: text
    │   ├── template_type: text ('task_list' | 'field_input')
    │   └── [description, sop, items, review_time, audit fields]
    │
    └── SubModule (PrimusGFS)
        │
        ├── ComplianceDoc (1:1)
        │   ├── Table: document (where doc_type indicates compliance)
        │   ├── id: uuid
        │   ├── org_id: text
        │   ├── framework_id: text ('primus_gfs')
        │   ├── module_id: text
        │   ├── sub_module_id: text
        │   ├── sub_sub_module_id: text | null
        │   ├── title: text
        │   ├── status: text ('draft' | 'published' | 'archived')
        │   ├── content_key: text (S3 key for ProseMirror JSON)
        │   ├── doc_type: text | null
        │   ├── current_version: integer
        │   ├── analysis_score: jsonb | null
        │   └── [audit fields: created_by, updated_by, published_at, renewal]
        │   └── UNIQUE (org_id, framework_id, module_id, sub_module_id, sub_sub_module_id)
        │
        └── CompanyDocument (1:N)
            ├── Table: document (where doc_type = 'company')
            ├── id: uuid
            ├── org_id: text
            ├── sub_module_id: text (same table as ComplianceDoc)
            ├── title: text
            ├── content_key: text (S3 key for uploaded DOCX)
            ├── doc_type: 'company'
            ├── renewal: text | null
            └── [same fields as document table]
```

**Key Findings:**
- **ComplianceDoc & CompanyDocument share the same `document` table**, distinguished by context/doc_type
- **JobTemplate** exists at **organization level** with NO sub_module_id field
- **LogTemplate** exists at **organization level** with NO sub_module_id field
- ComplianceDoc has 1:1 relationship via UNIQUE constraint
- CompanyDocument can have multiple docs per sub-module (1:N)

### Current Data Flow
1. User creates/edits ComplianceDoc via Tiptap editor
2. Content stored as ProseMirror JSON
3. No formal relationships between ComplianceDoc and operational artifacts
4. References are informal (text mentions, no structured links)

---

## 4. Target Architecture

### Enhanced Entity Relationships

```
Organization
    │
    ├── JobTemplate (org-level, not tied to sub-modules)
    ├── LogTemplate (org-level, not tied to sub-modules)
    │
    └── SubModule (PrimusGFS)
        │
        ├── ComplianceDoc (1:1)
        │   │
        │   └── ComplianceArtifactLink (1:N) ◄─── NEW LINKING TABLE
        │       ├── links to → JobTemplate (org-level, no sub_module validation)
        │       ├── links to → LogTemplate (org-level, no sub_module validation)
        │       └── links to → CompanyDocument (same sub_module_id)
        │
        └── CompanyDocument (1:N, same sub_module_id)
```

**Design Implications:**
- **JobTemplate links**: Validated at org-level only (user can link any job template from their org)
- **LogTemplate links**: Validated at org-level only (user can link any log template from their org)
- **CompanyDocument links**: Validated by sub_module_id matching (enforces relevance)

### Key Design Principles
1. **Non-Invasive**: No modifications to existing tables
2. **Polymorphic**: Single table handles multiple artifact types
3. **Validated**: Sub-module consistency enforced at service layer
4. **Explicit**: Links created manually, not auto-generated
5. **Auditable**: Full creation/deletion history maintained

---

## 5. Database Schema

### New Table: `compliance_artifact_links`

```sql
CREATE TYPE artifact_type AS ENUM (
    'job_template',
    'company_document',
    'log_template'
);

CREATE TABLE compliance_artifact_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Source: ComplianceDoc
    compliance_doc_id UUID NOT NULL,
    
    -- Target: Polymorphic artifact reference
    artifact_type artifact_type NOT NULL,
    artifact_id UUID NOT NULL,
    
    -- Optional metadata
    description TEXT,
    link_context TEXT, -- Where in the doc this link is relevant
    display_order INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- User who created the link
    deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
    
    -- Constraints
    CONSTRAINT fk_compliance_doc 
        FOREIGN KEY (compliance_doc_id) 
        REFERENCES compliance_docs(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint: prevent duplicate links
    CONSTRAINT unique_artifact_link 
        UNIQUE (compliance_doc_id, artifact_type, artifact_id)
        WHERE deleted_at IS NULL,
    
    -- Index for efficient lookups
    CREATE INDEX idx_artifact_links_compliance_doc 
        ON compliance_artifact_links(compliance_doc_id)
        WHERE deleted_at IS NULL,
    
    CREATE INDEX idx_artifact_links_artifact 
        ON compliance_artifact_links(artifact_type, artifact_id)
        WHERE deleted_at IS NULL
);
```

### Drizzle Schema Definition

```typescript
// db/producex/schema/compliance-artifact-links.ts

export const artifactTypeEnum = pgEnum('artifact_type', [
    'job_template',
    'company_document',
    'log_template',
]);

export const complianceArtifactLinks = pgTable(
    'compliance_artifact_links',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        
        complianceDocId: uuid('compliance_doc_id')
            .notNull()
            .references(() => complianceDocs.id, { onDelete: 'cascade' }),
        
        artifactType: artifactTypeEnum('artifact_type').notNull(),
        artifactId: uuid('artifact_id').notNull(),
        
        description: text('description'),
        linkContext: text('link_context'),
        displayOrder: integer('display_order').default(0),
        
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
        createdBy: uuid('created_by'),
        deletedAt: timestamp('deleted_at', { withTimezone: true }),
    },
    (table) => ({
        uniqueArtifactLink: unique('unique_artifact_link')
            .on(table.complianceDocId, table.artifactType, table.artifactId)
            .where(sql`deleted_at IS NULL`),
        
        complianceDocIndex: index('idx_artifact_links_compliance_doc')
            .on(table.complianceDocId)
            .where(sql`deleted_at IS NULL`),
        
        artifactIndex: index('idx_artifact_links_artifact')
            .on(table.artifactType, table.artifactId)
            .where(sql`deleted_at IS NULL`),
    })
);
```

---

## 6. Artifact Types Supported

### Job Template
- **Table**: `job_templates`
- **Purpose**: Link compliance procedures to standardized job configurations
- **Use Case**: "This quality control procedure is implemented via Job Template: Daily Temperature Monitoring"
- **Scope**: Organization-level (not tied to specific sub-modules)
- **Validation**: 
  - Must exist in `job_templates` table
  - Must belong to same `org_id` as ComplianceDoc
  - Must be active (`active = true`)
  - **No sub_module_id validation** (job templates are org-wide)
- **Fields**: name, category, description, sop (text reference), doc_num

### Log Template
- **Table**: `log_templates`
- **Purpose**: Link compliance procedures to daily log templates for tracking and documentation
- **Use Case**: "This quality control procedure requires Daily Temperature Log Template"
- **Scope**: Organization-level (not tied to specific sub-modules)
- **Validation**: 
  - Must exist in `log_templates` table
  - Must belong to same `org_id` as ComplianceDoc
  - **No sub_module_id validation** (log templates are org-wide)
- **Fields**: name, category, description, template_type, items, sop

### Company Document
- **Table**: `document` (where `doc_type = 'company'`)
- **Purpose**: Link supporting documentation (SOPs, policies, procedures, forms)
- **Use Case**: "This compliance section references SOP-QC-001: Quality Control Procedures"
- **Scope**: Sub-module specific
- **Validation**: 
  - Must exist in `document` table with `doc_type = 'company'`
  - **Must belong to same `sub_module_id`** as ComplianceDoc (enforces relevance)
  - Must belong to same `org_id`
  - Must not be soft-deleted (`deleted_at IS NULL`)
- **Fields**: title, content_key (S3 path), renewal period, status

### Future Extensibility
The `artifact_type` enum can be extended to support:
- `job_instance` - Linking to specific job executions (table: `jobs`)
- `external_reference` - Linking to external standards/regulations
- `training_module` - Linking to training materials

**Note on Log Templates**: The system has `log_templates` table with task lists (checkbox tasks) and field inputs (text fields), used for daily logging activities.

---

## 7. Service Layer Validation Rules

### Core Validation Logic

```typescript
// lib/services/compliance-artifact-links.ts

interface LinkValidationRule {
    name: string;
    validate: (input: LinkCreationInput) => Promise<ValidationResult>;
}

const validationRules: LinkValidationRule[] = [
    {
        name: 'compliance_doc_exists',
        validate: async (input) => {
            const doc = await getComplianceDoc(input.complianceDocId);
            return { valid: !!doc, error: 'ComplianceDoc not found' };
        }
    },
    {
        name: 'artifact_exists',
        validate: async (input) => {
            const artifact = await getArtifact(input.artifactType, input.artifactId);
            return { valid: !!artifact, error: `${input.artifactType} not found` };
        }
    },
    {
        name: 'same_submodule_or_org',
        validate: async (input) => {
            const doc = await getComplianceDoc(input.complianceDocId);
            const artifact = await getArtifact(input.artifactType, input.artifactId);
            
            // Job templates are org-level, only validate org_id
            if (input.artifactType === 'job_template') {
                const valid = doc.orgId === artifact.orgId;
                return {
                    valid,
                    error: valid ? null : 'Job Template must belong to same organization'
                };
            }
            
            // Log templates are org-level, only validate org_id
            if (input.artifactType === 'log_template') {
                const valid = doc.orgId === artifact.orgId;
                return {
                    valid,
                    error: valid ? null : 'Log Template must belong to same organization'
                };
            }
            
            // Company documents must match sub_module_id
            if (input.artifactType === 'company_document') {
                const sameOrg = doc.orgId === artifact.orgId;
                const sameSubModule = doc.subModuleId === artifact.subModuleId;
                const valid = sameOrg && sameSubModule;
                return {
                    valid,
                    error: valid ? null : 'Company Document must belong to same sub-module as ComplianceDoc'
                };
            }
            
            return { valid: false, error: 'Unknown artifact type' };
        }
    },
    {
        name: 'no_duplicate_link',
        validate: async (input) => {
            const existing = await findLink(input);
            return {
                valid: !existing,
                error: 'Link already exists'
            };
        }
    },
    {
        name: 'artifact_not_deleted',
        validate: async (input) => {
            const artifact = await getArtifact(input.artifactType, input.artifactId);
            const valid = !artifact.deletedAt;
            return {
                valid,
                error: 'Cannot link to deleted artifact'
            };
        }
    }
];
```

### Validation Workflow

```
Link Creation Request
    ↓
Validate ComplianceDoc exists
    ↓
Validate artifact exists (polymorphic lookup by type)
    ↓
Type-specific validation:
  ├─ JobTemplate: Check org_id match + active status
  ├─ LogTemplate: Check org_id match
  └─ CompanyDocument: Check org_id + sub_module_id match
    ↓
Validate no duplicate link
    ↓
Validate artifact not soft-deleted
    ↓
Create link record
    ↓
Return success with link metadata
```

**Artifact Lookup by Type:**
```typescript
async function getArtifact(artifactType: string, artifactId: string) {
    switch (artifactType) {
        case 'job_template':
            return query('SELECT * FROM job_templates WHERE id = $1', [artifactId]);
        case 'log_template':
            return query('SELECT * FROM log_templates WHERE id = $1', [artifactId]);
        case 'company_document':
            return query(
                `SELECT * FROM document 
                 WHERE id = $1 AND doc_type = 'company'`, 
                [artifactId]
            );
        default:
            throw new Error('Unknown artifact type');
    }
}
```

---

## 8. API Endpoints

### 8.1 Create Link

```typescript
POST /api/compliance/documents/{docId}/links

Request Body:
{
    "artifactType": "job_template" | "company_document" | "log_template",
    "artifactId": "uuid",
    "description": "Optional context about this link",
    "linkContext": "Section 2.1 - Quality Control",
    "displayOrder": 0
}

Response 201:
{
    "id": "uuid",
    "complianceDocId": "uuid",
    "artifactType": "job_template",
    "artifactId": "uuid",
    "artifact": {
        "id": "uuid",
        "name": "Daily Temperature Check",
        "subModuleId": "uuid"
    },
    "description": "...",
    "linkContext": "...",
    "createdAt": "2026-02-28T10:00:00Z",
    "createdBy": "uuid"
}

Errors:
400 - Invalid input
403 - Unauthorized
404 - ComplianceDoc or artifact not found
409 - Link already exists
422 - Validation failed (wrong org or sub-module mismatch for company docs)
```

### 8.2 List Links for ComplianceDoc

```typescript
GET /api/compliance/documents/{docId}/links

Query Parameters:
- artifactType?: "job_template" | "company_document" | "log_template"
- includeDeleted?: boolean (default: false)

Response 200:
{
    "links": [
        {
            "id": "uuid",
            "artifactType": "job_template",
            "artifactId": "uuid",
            "artifact": {
                "id": "uuid",
                "name": "Daily Temperature Check",
                "subModuleId": "uuid",
                "status": "active"
            },
            "description": "...",
            "linkContext": "...",
            "displayOrder": 0,
            "createdAt": "2026-02-28T10:00:00Z"
        }
    ],
    "total": 1,
    "byType": {
        "job_template": 3,
        "log_template": 1,
        "company_document": 2
    }
}
```

### 8.3 Delete Link

```typescript
DELETE /api/compliance/documents/{docId}/links/{linkId}

Response 204: No Content

Errors:
403 - Unauthorized
404 - Link not found
```

### 8.4 Bulk Link Creation

```typescript
POST /api/compliance/documents/{docId}/links/bulk

Request Body:
{
    "links": [
        {
            "artifactType": "job_template",
            "artifactId": "uuid",
            "description": "..."
        },
        {
            "artifactType": "company_document",
            "artifactId": "uuid"
        }
    ]
}

Response 207 (Multi-Status):
{
    "results": [
        { "index": 0, "status": "created", "linkId": "uuid" },
        { "index": 1, "status": "failed", "error": "Duplicate link" }
    ],
    "summary": {
        "total": 2,
        "created": 1,
        "failed": 1
    }
}
```

### 8.5 Get Reverse Links (Artifact → ComplianceDocs)

```typescript
GET /api/artifacts/{artifactType}/{artifactId}/compliance-links

Response 200:
{
    "artifactType": "job_template",
    "artifactId": "uuid",
    "artifact": {
        "id": "uuid",
        "name": "Daily Temperature Check"
    },
    "complianceDocs": [
        {
            "id": "uuid",
            "subModuleId": "uuid",
            "subModuleName": "2.1.1 Temperature Control",
            "linkDescription": "...",
            "linkContext": "..."
        }
    ]
}
```

### 8.6 Get Available Artifacts for Linking

```typescript
GET /api/compliance/documents/{docId}/available-artifacts

Purpose:
Retrieve artifacts that can be linked to a compliance document.
Automatically excludes artifacts that are already linked.

Response 200:
{
    "success": true,
    "jobTemplates": [
        {
            "id": "uuid",
            "name": "Daily Temperature Check",
            "category": "quality_control",
            "description": "...",
            "active": true,
            "org_id": "uuid",
            ...
        }
    ],
    "logTemplates": [
        {
            "id": "uuid",
            "name": "Daily Temperature Log",
            "category": "quality_control",
            "template_type": "field_input",
            "org_id": "uuid",
            ...
        }
    ],
    "companyDocuments": [
        {
            "id": "uuid",
            "title": "SOP-QC-001: Quality Control Procedures",
            "doc_type": "company",
            "sub_module_id": "uuid",
            "org_id": "uuid",
            ...
        }
    ]
}

Notes:
- Only returns active job templates
- Only returns company documents from the same sub-module
- Org-level templates (job & log) are not filtered by sub-module
- Automatically excludes already linked artifacts

Errors:
400 - Invalid document (not a compliance document)
401 - Unauthorized
404 - Compliance document not found
```

---

## 9. UI Integration Plan

### 9.1 ComplianceDoc Editor Integration

#### Tiptap Editor Enhancement

**Location**: Within the existing Tiptap editor for ComplianceDoc

**New UI Component**: `ArtifactLinkManager` (sidebar or panel)

**Features**:
- **Link Browser**: View all linked artifacts grouped by type
- **Quick Add**: Search and link artifacts inline while editing
- **Link Preview**: Hover to see artifact details
- **Context Annotation**: Add notes about why artifact is linked

**Editor Interaction**:
```typescript
// Optional: Tiptap extension for inline artifact mentions
// e.g., @job-template:uuid or [[Job: Daily Check]]
// These render as chips/badges in the editor
// Clicking opens artifact in modal or new tab
```

#### Layout
```
┌─────────────────────────────────────────┐
│  ComplianceDoc Editor                   │
│  ┌───────────────────────────────────┐  │
│  │ Tiptap Editor Content             │  │
│  │                                   │  │
│  │ When implementing quality control │  │
│  │ procedures, refer to:             │  │
│  │ [🔗 Job: Daily Temp Check]       │  │ ← Linked artifact chip
│  │ [🔗 Doc: SOP-QC-001]              │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Linked Artifacts (3)              │  │
│  │                                   │  │
│  │ Job Templates (1) [org-wide]      │  │
│  │  ├─ Daily Temperature Check  [×]  │  │
│  │                                   │  │
│  │ Company Documents (2)             │  │
│  │  ├─ SOP-001: Quality Control [×] │  │
│  │  └─ Policy: Temperature Logs [×] │  │
│  │                                   │  │
│  │ [+ Add Artifact Link]             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 9.2 Artifact Link Dialog

**Triggered by**: "+ Add Artifact Link" button

**Dialog Flow**:
1. **Step 1**: Select artifact type (Job Template / Log Template / Company Document)
2. **Step 2**: Search/select specific artifact with smart filtering:
   - **Job Template**: Shows all active templates from organization (no sub-module filter)
   - **Log Template**: Shows all templates from organization (no sub-module filter)
   - **Company Document**: Auto-filters to same sub_module_id only
3. **Step 3**: (Optional) Add description and context
4. **Step 4**: Confirm and create link

**Search/Filter Logic**:
- **Job Templates**: 
  - Filter: `org_id = current_org AND active = true`
  - No sub-module restriction (org-wide resources)
  - Shows: name, category, description
- **Log Templates**:
  - Filter: `org_id = current_org`
  - No sub-module restriction (org-wide resources)
  - Shows: name, category, template_type, description
- **Company Documents**: 
  - Filter: `org_id = current_org AND sub_module_id = current_sub_module AND deleted_at IS NULL`
  - Restricted to same sub-module (enforces relevance)
  - Shows: title, doc_type, renewal
- Displays existing links (grayed out to prevent duplicates)
- Type-ahead search by name/title

### 9.3 Artifact Detail Views

**Enhancement to existing artifact pages**:

**Job Template Detail Page** (`/compliance/job-templates/{id}`)
- New section: "Referenced in Compliance Docs"
- Shows which ComplianceDocs (potentially across multiple sub-modules) link to this template
- Displays: module, sub-module, doc title, link context
- Click to navigate to doc with link context

**Company Document Detail Page** (`/documents/{id}`)
- New section: "Referenced in Compliance Docs"
- Shows which ComplianceDocs link to this document
- Should only show docs from the same sub-module

### 9.4 Compliance Overview Integration

**Module Detail View**:
- Show artifact link count as metric
- "X artifacts linked" indicator
- Visual representation of compliance-artifact coverage

---

## 10. Future Extensibility

### Phase 2 Enhancements

#### 10.1 Smart Linking Suggestions
```typescript
// Analyze ComplianceDoc content and suggest relevant artifacts
POST /api/compliance/documents/{docId}/suggest-links

Response:
{
    "suggestions": [
        {
            "artifactType": "job_template",
            "artifactId": "uuid",
            "confidence": 0.85,
            "reason": "Document mentions 'temperature monitoring' and this job implements it",
            "artifact": { ... }
        }
    ]
}
```

#### 10.2 Link Analytics
- **Coverage Metrics**: % of ComplianceDocs with artifact links
- **Orphan Detection**: Artifacts not linked to any compliance doc
- **Link Health**: Identify broken links (deleted artifacts)
- **Audit Reports**: Generate traceability matrix for auditors

#### 10.3 Bidirectional Workflows
- **From Artifact**: "Create ComplianceDoc linked to this job"
- **Link Templates**: Save common link patterns for reuse

#### 10.4 Additional Artifact Types

**Log Templates**:
```sql
ALTER TYPE artifact_type ADD VALUE 'log_template';
```
Note: System already has `log_templates` table with fields:
- id, name, org_id, template_type ('task_list' | 'field_list')
- task_list (jsonb) or field_list (jsonb)
- Similar org-level pattern as job_templates

**Job Instances (Scheduled Jobs)**:
```sql
ALTER TYPE artifact_type ADD VALUE 'job_instance';
```
Note: System already has `jobs` table (instances of job_templates):
- id, template_id, assigned_to, frequency, next_execution_date
- Could link specific scheduled jobs to compliance docs

**External References**:
```sql
ALTER TYPE artifact_type ADD VALUE 'external_reference';

-- Additional table for external reference metadata
CREATE TABLE external_references (
    id UUID PRIMARY KEY,
    url TEXT,
    reference_type TEXT, -- 'regulation', 'standard', 'guideline'
    title TEXT,
    ...
);
```

#### 10.5 Versioning & History
- Track which version of an artifact was linked
- Notify when linked artifacts are updated
- Historical view: "Which artifacts were linked during Audit X?"

#### 10.6 Workflow Integration
- **Required Links**: Mark certain artifact types as required before approval
- **Validation Rules**: "Quality modules must link at least one SOP"
- **Approval Gates**: "Cannot finalize without linking job templates"

#### 10.7 Export & Reporting
- **Audit Package**: Export ComplianceDoc with all linked artifacts as PDF
- **Traceability Matrix**: Excel/CSV export showing doc-artifact mappings
- **Evidence Bundle**: Zip file with doc + all linked files

---

## 11. Backfill Strategy & Best Practices

### Automated Backfill (Safe)

The backfill migration automatically links **Job Templates** and **Log Templates** based on the `sop` field:

```sql
-- Link job templates where sop = sub_module_id
INNER JOIN document d ON jt.sop = d.sub_module_id
```

**Why this is safe:**
- Job/Log templates are **org-wide** (not sub-module specific)
- The `sop` field explicitly indicates which sub-module they're designed for
- This creates **suggested relationships** that users can remove if not relevant
- Multiple compliance docs can share the same templates

### Manual Linking (Required for Company Documents)

**Company Documents should NOT be auto-linked** in the backfill. Here's why:

❌ **Bad Approach (Too Aggressive):**
```sql
-- This links EVERY company doc to EVERY compliance doc in the same sub-module
INNER JOIN document cd ON company_doc.sub_module_id = cd.sub_module_id
```

**Problem:** If sub-module `1.01` has:
- Compliance Doc A, B, C
- Company Doc X, Y, Z

This creates **9 links** (A→X, A→Y, A→Z, B→X, B→Y, B→Z, C→X, C→Y, C→Z), which defeats the purpose of artifact linking.

✅ **Correct Approach (Manual Curation):**
- Users manually link **specific** company documents to **specific** compliance documents
- Creates intentional, meaningful relationships for traceability
- Enables proper audit trails showing which docs support which requirements

### If You Ran the Backfill Already

If you already ran the backfill with auto-linked company documents:

1. **Run the rollback script:**
   ```bash
   psql -d your_database -f db/migrations/rollback-company-doc-links.sql
   ```

2. **This removes only auto-linked company documents** (where `created_by IS NULL`)

3. **Manually created links are preserved** (where `created_by` has a user ID)

### Best Practices

1. **Job/Log Templates**: Auto-link via backfill using `sop` field
2. **Company Documents**: Let users manually link for specific relationships
3. **During Backfill**: Use `created_by IS NULL` to distinguish auto-linked vs. user-created
4. **Monitoring**: Track link density to identify over-linking or under-linking patterns

---

## 12. Implementation Checklist

### Phase 1: Core Functionality
- [x] Create database migration for `compliance_artifact_links` table
- [x] Implement repository layer (db/queries/compliance-artifact-links.ts)
- [x] Create service layer with validation rules (lib/services/complianceArtifactService.ts)
- [x] Build API endpoints (CRUD + available artifacts)
- [ ] Add API integration tests
- [ ] Implement UI components for link management
- [ ] Add link display in ComplianceDoc editor
- [ ] Update artifact detail pages with reverse links
- [ ] Write end-to-end tests
- [ ] Update API documentation

### Phase 2: Enhancement
- [ ] Implement smart link suggestions
- [ ] Add link analytics dashboard
- [ ] Create audit export functionality
- [ ] Build traceability matrix view

---

## 13. Technical Considerations

### Performance
- **Indexed Queries**: Ensure all lookup queries use indexes
- **Batch Loading**: Use batch queries to load artifacts efficiently
- **Caching**: Consider caching artifact metadata for links
- **Polymorphic Queries**: Job templates and company documents come from different tables

### Data Integrity
- **Cascade Deletes**: When ComplianceDoc deleted, links auto-delete (via FK constraint)
- **Soft Deletes**: Artifact links use soft delete for audit trail
- **Foreign Key Validation**: Rely on DB constraints for compliance_doc_id
- **Application-Level Validation**: Artifact existence checked in service layer (different tables)

### Artifact Validation Strategy
- **Job Template**: Query `job_templates` table, validate org_id + active status
- **Log Template**: Query `log_templates` table, validate org_id
- **Company Document**: Query `document` table with `doc_type = 'company'`, validate org_id + sub_module_id
- No FK constraint to artifact tables (polymorphic relationship)

### Security
- **Authorization**: User must have access to both ComplianceDoc and artifact
- **Audit Logging**: Track who creates/deletes links
- **API Rate Limiting**: Protect bulk endpoints

### Monitoring
- **Metrics to Track**:
  - Link creation/deletion rate
  - Average links per ComplianceDoc
  - API response times
  - Failed validation attempts

---

## 14. Open Questions for Implementation

1. **Editor Integration Depth**: Should artifact links be mentionable inline in the Tiptap editor content, or only managed via separate UI panel?

2. **Link Ordering**: Should `display_order` be managed automatically or manually by users?

3. **Permissions**: Should there be separate permissions for managing links vs. editing ComplianceDoc content?

4. **Notifications**: Should users be notified when a linked artifact is updated or deleted?

5. **Bulk Operations**: What's the max number of links allowed in bulk creation? Should there be a limit per ComplianceDoc?

6. **Archive Behavior**: When an artifact is archived/deactivated, should links be soft-deleted or just flagged?

7. **Job Template Scope**: Since job templates are org-wide, should we add optional tagging/categorization to help users filter relevant templates when linking? (e.g., category field, sub-module suggestions)

8. **Document Table Queries**: How to efficiently distinguish between ComplianceDoc and CompanyDocument in the same `document` table? Should we add explicit `doc_type` values or rely on other fields?

---

## Appendix: Example Use Cases

### Use Case 1: Quality Control Module
A ComplianceDoc for PrimusGFS module "2.1.1 Temperature Monitoring" links to:
- Job Template: "Daily Temperature Check" (org-level, reusable across modules)
- Log Template: "Daily Temperature Log" (org-level, used for daily logging)
- Company Document: "SOP-QC-001 Temperature Control Policy" (uploaded to this sub-module)

**Benefit**: Auditor can trace requirement → procedure → implementation → logging

**Note**: Job Template and Log Template are org-wide and may be used by multiple compliance docs across different sub-modules

### Use Case 2: Traceability During Audit
Auditor asks: "How do you implement section 2.1.1?"
Navigate to ComplianceDoc → view linked artifacts → show job execution history

**Benefit**: Complete compliance evidence chain in seconds

### Use Case 3: Change Impact Analysis
Job Template "Daily Temp Check" needs updating.
View reverse links → identifies 3 ComplianceDocs referencing it
Review docs to ensure changes don't break compliance

**Benefit**: Prevent compliance drift when updating operations

---

**Document Version**: 3.0  
**Last Updated**: 2026-02-28  
**Status**: Ready for Implementation  
**Changes from v2.0**: Updated to use log_template instead of task_template for clarity (log templates are the actual system entity)