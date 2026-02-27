# Job Templates System - Implementation Guide

## Overview

A production-grade template-driven job execution system built for Next.js App Router with TypeScript, implementing a clean layered architecture and metadata-driven design.

## Architecture

### Layered Design
```
db → services → actions → ui
```

- **Database Layer**: PostgreSQL with JSONB for dynamic fields
- **Service Layer**: Pure functions, business logic, derived status
- **Actions Layer**: Server actions with Clerk auth and Zod validation
- **UI Layer**: Server Components + Client Components with shadcn/ui

## Domain Model

```
Template → Job → ActionExecution → ExecutionHistory
```

### Key Concepts

1. **Job Templates**: Reusable templates with dynamic fields
   - Creation fields: Collected when creating a job
   - Action fields: Collected when executing a job

2. **Jobs**: Instances created from templates
   - Snapshot template version
   - Recurring with configurable frequency
   - Assigned to users

3. **Job Execution**: Action-based execution
   - Captured via modal with dynamic fields
   - Creates execution history entry
   - Updates derived status

4. **Derived Status**: Runtime-calculated status
   - **UPCOMING**: Before execution window opens (today < cycleStart)
   - **OPEN**: Execution window is open, ready to execute (cycleStart <= today < cycleEnd, not executed)
   - **COMPLETED**: Executed within current cycle window
   - **OVERDUE**: Past execution deadline without being executed (today >= cycleEnd, not executed)

## Database Schema

### Tables

1. **job_templates**
   - id, name, category, description, version
   - created_by, created_at, updated_at

2. **job_template_fields**
   - Metadata-driven field definitions
   - field_category: 'creation' | 'action'
   - field_type: text, textarea, number, date, select, checkbox
   - config_json: JSONB for field-specific config

3. **jobs**
   - template_id, template_version, title
   - assigned_to, frequency_value, frequency_unit
   - next_execution_date

4. **job_creation_values**
   - Stores creation field values as JSONB

5. **job_actions**
   - Execution history entries
   - performed_by, performed_at, notes

6. **job_action_values**
   - Action field values captured during execution
   - Includes field metadata (label, type) for historical accuracy

### Key Design Decisions

- **NO dynamic columns**: All fields stored as JSONB
- **Version snapshots**: Jobs store template version
- **JSON aggregation**: Efficient execution history queries
- **Foreign keys**: CASCADE on child tables, RESTRICT on templates

## File Structure

```
lib/
├── db/
│   └── jobs-schema.sql                    # Database schema
├── validators/
│   └── jobValidators.ts                   # Zod schemas
├── services/
│   ├── jobTemplateService.ts              # Template CRUD + queries
│   └── jobService.ts                      # Job CRUD + derived status
└── actions/
    ├── jobTemplateActions.ts              # Template server actions
    └── jobActions.ts                      # Job server actions

app/
├── api/
│   ├── jobs/
│   │   ├── route.ts                       # GET all jobs
│   │   └── [id]/route.ts                  # GET job detail
│   └── job-templates/
│       ├── route.ts                       # GET all templates
│       └── [id]/route.ts                  # GET template detail
└── [locale]/(active-access)/compliance/
    ├── job-templates/
    │   ├── page.tsx                       # Templates list
    │   ├── create/page.tsx                # Create template
    │   └── [id]/page.tsx                  # Template detail
    └── jobs/
        ├── page.tsx                       # Jobs list with tabs
        ├── create/page.tsx                # Create job
        └── [id]/page.tsx                  # Job detail with execution

components/jobs/
├── TemplateBuilderForm.tsx                # Template creation form
├── JobCreateForm.tsx                      # Job creation form
├── JobsList.tsx                           # Jobs list with status badges
├── JobDetailContent.tsx                   # Job detail page content
├── DynamicFieldRenderer.tsx               # Renders dynamic fields
├── ExecutionHistoryTimeline.tsx           # Timeline visualization
└── ActionExecutionModal.tsx               # Execute job modal
```

## Key Features

### 1. Derived Status Logic

Status is calculated dynamically at runtime (never stored):

```typescript
function deriveStatus(job: Job, lastAction: JobAction | null): JobStatus {
  const today = new Date();
  const nextExecution = new Date(job.next_execution_date);
  const windowEnd = calculateWindowEnd(nextExecution, job.frequency);

  // Check if action exists in current window
  if (lastAction && isInWindow(lastAction.performed_at, nextExecution, windowEnd)) {
    return "COMPLETED";
  }

  // No action in window
  if (today >= windowEnd) return "OVERDUE";
  if (today >= nextExecution) return "OPEN";
  return "UPCOMING";
}
```

### 2. Metadata-Driven Fields

All fields are metadata, not database columns:

```typescript
interface JobTemplateField {
  field_key: string;
  field_label: string;
  field_type: "text" | "textarea" | "number" | "date" | "checkbox";
  field_category: "creation" | "action";
  is_required: boolean;
  config_json: Record<string, any>; // Extensible config
}
```

### 3. Execution History with JSON Aggregation

Efficient query to fetch complete execution history:

```sql
SELECT 
  a.id,
  a.performed_by,
  a.performed_at,
  a.notes,
  json_agg(
    json_build_object(
      'field_key', av.field_key,
      'field_label', av.field_label,
      'field_type', av.field_type,
      'value', av.value_json
    ) ORDER BY av.field_key
  ) FILTER (WHERE av.id IS NOT NULL) as action_values
FROM job_actions a
LEFT JOIN job_action_values av ON av.action_id = a.id
WHERE a.job_id = $1
GROUP BY a.id
ORDER BY a.performed_at DESC
```

## Usage Examples

### 1. Create a Job Template

```typescript
const result = await createJobTemplate({
  name: "Monthly Security Review",
  category: "Security",
  description: "Review security logs and incidents",
  fields: [
    {
      field_key: "department",
      field_label: "Department",
      field_type: "text",
      field_category: "creation",
      is_required: true,
      display_order: 0,
    },
    {
      field_key: "findings",
      field_label: "Key Findings",
      field_type: "textarea",
      field_category: "action",
      is_required: true,
      display_order: 0,
    },
  ],
});
```

### 2. Create a Job from Template

```typescript
const result = await createJob({
  template_id: "template-uuid",
  title: "January 2026 Security Review",
  assigned_to: "security@company.com",
  frequency_value: 1,
  frequency_unit: "months",
  next_execution_date: "2026-01-01",
  creation_field_values: {
    department: "Engineering",
  },
});
```

### 3. Execute a Job

```typescript
const result = await executeJobAction({
  job_id: "job-uuid",
  notes: "All security checks passed",
  action_field_values: {
    findings: "No critical vulnerabilities found",
    incidents_count: 0,
  },
});
```

### 4. Get Jobs with Derived Status

```typescript
const result = await getJobsWithStatus("OVERDUE");
// Returns only overdue jobs with status calculated at runtime
```

## Best Practices

### Service Layer
- Pure functions only
- No side effects
- Comprehensive error handling
- Single responsibility

### Server Actions
- Always validate with Zod
- Use Clerk auth() for user context
- Return success/error objects
- Never expose internal errors

### Route Handlers
- Use for GET operations only
- Leverage Next.js caching
- Return JSON responses
- Handle auth with Clerk

### UI Components
- Server Components by default
- Client Components for forms/modals
- Use shadcn/ui primitives
- Implement loading states

## Database Migration

To set up the database:

```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Run the schema
\i lib/db/jobs-schema.sql

# Verify tables
\dt
```

## Testing Workflow

1. **Create Template**
   - Navigate to `/compliance/job-templates`
   - Click "Create Template"
   - Add creation and action fields

2. **Create Job**
   - Navigate to `/compliance/jobs`
   - Click "Create Job"
   - Select template and fill creation fields

3. **Execute Job**
   - Navigate to job detail page
   - Click "Execute Job"
   - Fill action fields and notes

4. **View History**
   - See execution timeline with all captured data

## Status Calculation Examples

### Example 1: Due Job
```
Next Execution: Jan 1, 2026
Frequency: 1 month
Today: Jan 5, 2026
Last Action: None in current window

Status: DUE
```

### Example 2: Completed Job
```
Next Execution: Jan 1, 2026
Frequency: 1 month
Today: Jan 10, 2026
Last Action: Jan 8, 2026

Status: COMPLETED (action exists in window)
```

### Example 3: Overdue Job
```
Next Execution: Jan 1, 2026
Frequency: 1 month
Today: Feb 5, 2026
Last Action: None in current window

Status: OVERDUE (past window end: Feb 1)
```

## Performance Considerations

1. **Status Calculation**: Done in-memory after fetching jobs
2. **JSON Aggregation**: Single query for execution history
3. **Indexing**: All foreign keys and date columns indexed
4. **Caching**: Route handlers can leverage Next.js cache

## Security

- Clerk authentication on all server actions and route handlers
- User-scoped queries (created_by filter)
- Zod validation on all inputs
- No SQL injection (parameterized queries)
- JSONB prevents dynamic column exploits

## Future Enhancements

1. **Notifications**: Email reminders for due/overdue jobs
2. **Bulk Operations**: Execute multiple jobs at once
3. **Template Versioning**: More sophisticated version control
4. **Field Validation**: Custom validation rules in config_json
5. **File Attachments**: Evidence upload during execution
6. **Audit Trail**: Track all template and job modifications
7. **Reporting**: Dashboard with status metrics

## Troubleshooting

### Jobs not showing correct status
- Check derived status logic in `jobService.ts`
- Verify window calculation matches frequency unit
- Ensure last action is being fetched correctly

### Dynamic fields not rendering
- Verify field_type is valid enum value
- Check DynamicFieldRenderer switch statement
- Ensure config_json is valid JSON

### Execution history empty
- Check JSON aggregation query
- Verify job_action_values are being inserted
- Confirm foreign key relationships

## Conclusion

This implementation follows Next.js best practices with:
- Clean separation of concerns
- Type-safe end-to-end
- Metadata-driven flexibility
- Runtime-derived status
- Scalable architecture

The system is production-ready and can handle complex recurring job scenarios with full execution history tracking.
