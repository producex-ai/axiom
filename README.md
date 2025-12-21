# ProduceX Axiom

AI-powered compliance documentation platform for food safety standards.

## Overview

Axiom streamlines compliance documentation for food safety frameworks like Primus GFS, BRC, and FSSC 22000. The platform uses AI to generate, manage, and maintain compliance documents, helping organizations achieve and maintain certifications efficiently.

## Key Features

- **AI Document Generation** - Automatically generate compliance documents from framework requirements
- **Multi-Framework Support** - Primus GFS with extensibility for BRC, FSSC 22000, and other standards
- **Module-Based Organization** - Structured by framework modules and sub-modules
- **Document Lifecycle Management** - Draft, publish, and archive workflows with version control
- **Rich Text Editor** - Built on TipTap with AI assistance for content refinement
- **Real-time Collaboration** - Track who created and updated documents with timestamps
- **Document Conversion** - Seamless DOCX ↔ Markdown ↔ HTML conversion pipeline
- **AWS S3 Integration** - Secure document storage with direct download capabilities
- **Responsive Design** - Modern, mobile-first UI following industry best practices

## Tech Stack

- **Next.js 15.5.3** - React framework with App Router
- **React 19.1.0** - UI library with Server Components
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - High-quality, accessible component library
- **TipTap** - Rich text editor with collaborative features
- **React Query (@tanstack/react-query)** - Server state management with caching
- **AWS SDK** - S3 for document storage, Bedrock for AI capabilities
- **PostgreSQL** - Database for compliance data on AWS RDS
- **Biome** - Fast formatter and linter
- **Mammoth, Turndown, markdown-it, docx** - Document conversion pipeline
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites

- Node.js (latest LTS recommended)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd visio

# Install dependencies
npm install
```

### Environment Variables

Copy `env.template` to `.env.local` and provide values for all required keys:

**AWS Configuration:**
- `AWS_ACCESS_KEY_ID` — AWS Access Key ID for S3 and Bedrock
- `AWS_SECRET_ACCESS_KEY` — AWS Secret Access Key
- `AWS_REGION` — AWS region (e.g., us-east-1)
- `S3_BUCKET_NAME` — S3 bucket for document storage

**Database:**
- `POSTGRES_HOST` — PostgreSQL host (AWS RDS)
- `POSTGRES_DB` — Database name
- `POSTGRES_USER` — Database user
- `POSTGRES_PASSWORD` — Database password
- `POSTGRES_PORT` — Database port (default: 5432)

**Authentication:**
- `NEXTAUTH_SECRET` — Secret for NextAuth.js session encryption
- `NEXTAUTH_URL` — Application URL for authentication callbacks

### Development

```bash
# Start development server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Database Migrations

Run migrations against your PostgreSQL database:

```bash
# Run all migrations in order
psql -h <host> -U <user> -d <database> -f db/migrations/001_initial_schema.sql
psql -h <host> -U <user> -d <database> -f db/migrations/002_add_updated_by_fields.sql
psql -h <host> -U <user> -d <database> -f db/migrations/003_fix_sub_sub_module_id_nullable.sql
psql -h <host> -U <user> -d <database> -f db/migrations/004_change_ready_to_published.sql
```

## Code Quality

This project uses Biome for fast linting and formatting:

```bash
# Run linter
npm run lint

# Format code
npm run format
```

## Project Structure

```text
├── app/                          # Next.js App Router
│   ├── [locale]/                # Internationalized routes
│   │   ├── dashboard/          # Main application dashboard
│   │   │   └── compliance/     # Compliance module
│   │   │       ├── page.tsx    # Module overview with onboarding
│   │   │       └── documents/  # Document editing routes
│   │   ├── login/              # Authentication pages
│   │   ├── layout.tsx          # Locale-specific layout
│   │   └── page.tsx            # Localized homepage
│   ├── api/                     # API routes
│   │   ├── compliance/         # Compliance document APIs
│   │   │   ├── documents/      # CRUD operations
│   │   │   └── download/       # Document download
│   │   ├── frameworks/         # Framework data APIs
│   │   │   └── primus/         # Primus GFS specific
│   │   └── bedrock/            # AI generation endpoints
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   └── globals.css             # Global styles with Tailwind
├── actions/                     # Server actions
│   └── auth.ts                 # Authentication actions
├── components/                  # React components
│   ├── compliance/             # Compliance-specific components
│   │   ├── ComplianceContent.tsx        # Main content wrapper
│   │   ├── ModuleOverview.tsx           # Module cards grid
│   │   ├── ModuleDetailView.tsx         # Sub-module details
│   │   ├── SubModuleCard.tsx            # Document card component
│   │   ├── DocumentEditorDialog.tsx     # Editor modal
│   │   ├── GenerateDocumentDialog.tsx   # AI generation dialog
│   │   └── ModuleSelectionOnboarding.tsx # First-time setup
│   ├── editor/                 # TipTap editor components
│   │   ├── DocumentEditor.tsx  # Main editor component
│   │   ├── FormattingToolbar.tsx        # Text formatting
│   │   └── AIToolbar.tsx       # AI assistance features
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── alert-dialog.tsx
│   │   └── ...                 # Other UI primitives
│   ├── AppHeader.tsx           # Application header
│   ├── AppSidebar.tsx          # Navigation sidebar
│   ├── NavigationProgress.tsx  # Loading indicators
│   └── LoginForm.tsx           # Authentication form
├── lib/                         # Utilities and configurations
│   ├── compliance/             # Compliance logic
│   │   ├── queries.ts          # React Query hooks
│   │   └── document-generation.ts # AI generation logic
│   ├── primus/                 # Primus GFS data
│   │   ├── data.ts             # Framework structure
│   │   ├── db-helper.ts        # Database operations
│   │   └── data-merger.ts      # Merge framework with DB state
│   ├── db/                     # Database utilities
│   │   └── postgres.ts         # PostgreSQL connection
│   ├── editor/                 # Editor utilities
│   ├── ai/                     # AI integration
│   ├── auth.ts                 # Authentication config
│   ├── document-converters.ts  # DOCX/Markdown/HTML conversion
│   └── utils.ts                # Helper functions
├── db/                          # Database
│   ├── migrations/             # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_updated_by_fields.sql
│   │   ├── 003_fix_sub_sub_module_id_nullable.sql
│   │   └── 004_change_ready_to_published.sql
│   └── README.md               # Database documentation
├── docs/                        # Documentation
│   ├── auth.md
│   ├── layout-structure.md
│   ├── shipment-management.md
│   ├── DOCUMENT_EDITING_IMPLEMENTATION.md
│   ├── DOCUMENT_EDITING_QUICKSTART.md
│   └── DOCUMENT_GENERATION_SUMMARY.md
├── messages/                    # i18n translations
│   ├── en/
│   └── es/
└── middleware.ts               # Next.js middleware for auth
```

## Architecture

### Core Concepts

- **Framework-Based**: Organized around compliance frameworks (Primus GFS, BRC, etc.)
- **Module Hierarchy**: Framework → Module → Sub-Module → Sub-Sub-Module → Document
- **Document Lifecycle**: Draft → Published → Archived with version control
- **Server Components**: Leverage React Server Components for optimal performance
- **React Query**: Client-side caching with automatic background updates
- **Type-Safe**: Full TypeScript coverage with strict database types

### Key Workflows

**Onboarding Flow:**
1. User selects relevant modules from framework
2. System stores org-module associations in database
3. Dashboard shows only enabled modules

**Document Creation:**
1. Click "Create" on sub-module card
2. AI generates document from framework requirements
3. Document saved as Markdown in S3, metadata in PostgreSQL
4. Status set to "draft" with version 1

**Document Editing:**
1. TipTap editor loads Markdown → HTML conversion
2. Real-time editing with AI assistance
3. Save updates S3 content and database metadata
4. Publish changes status to "published"

**Document Download:**
1. Fetch Markdown from S3
2. Convert to DOCX with proper formatting
3. Stream file directly to user's browser

### Database Schema

**Tables:**
- `org_framework` - Organization framework enablement
- `org_module` - Module selections per organization
- `document` - Document metadata, status, and references

**Key Fields:**
- All tables have audit fields: `created_by`, `updated_by`, `created_at`, `updated_at`
- Documents track: `status`, `current_version`, `content_key` (S3 path)
- Hierarchical references: `framework_id`, `module_id`, `sub_module_id`, `sub_sub_module_id`

### AI Integration

- **AWS Bedrock** for document generation
- **Streaming responses** for real-time content creation
- **Context-aware** prompts using framework requirements
- **Editor AI tools** for content refinement and suggestions

## Contributing

1. Follow the established naming conventions (PascalCase for components, camelCase for utilities)
2. Keep framework data in `lib/primus/data.ts` separate from database logic
3. Use Biome for consistent code formatting
4. Maintain TypeScript strict mode compliance
5. Add database migrations for schema changes
6. Update React Query cache keys in `lib/compliance/queries.ts`
7. Document complex document conversion logic

## Recent Updates

- ✅ Status terminology changed from "ready" to "published"
- ✅ Added audit fields (updated_by, updated_at) to all documents
- ✅ Implemented automatic UI refresh with React Query cache invalidation
- ✅ Modernized SubModuleCard design with dropdown menus and metadata display
- ✅ Fixed document editor title duplication and change detection
- ✅ Added global navigation progress indicators
- ✅ Implemented direct file streaming for downloads
- ✅ Added shadcn/ui AlertDialog for delete confirmations

## License

Private - ProduceX
