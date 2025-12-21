# Database Setup Guide

This directory contains database migrations and setup scripts for the Primus GFS compliance platform.

## Database: AWS RDS PostgreSQL

The application uses AWS RDS PostgreSQL for data persistence.

## Quick Setup

### 1. Install Dependencies

```bash
npm install pg @types/pg
```

### 2. Configure Environment Variables

Copy `.env.template` to `.env.local` and fill in your AWS RDS PostgreSQL credentials:

```env
DB_HOST=your-postgres-host.rds.amazonaws.com
DB_PORT=5432
DB_NAME=producex
DB_USER=postgres
DB_PASSWORD=your_database_password
DB_SSL=true
```

### 3. Run Migrations

Connect to your AWS RDS PostgreSQL database and run the migration:

```bash
psql -h your-host.rds.amazonaws.com -U postgres -d producex -f db/migrations/001_primus_framework_schema.sql
```

Or use your preferred PostgreSQL client (pgAdmin, DBeaver, etc.) to execute the SQL file.

## Database Schema

### Tables

#### `org_framework`
Tracks which compliance frameworks an organization has enabled.

| Column | Type | Description |
|--------|------|-------------|
| org_id | UUID | Organization identifier (PK) |
| framework_id | TEXT | Framework ID like 'primus_gfs' (PK) |
| enabled_at | TIMESTAMPTZ | When framework was enabled |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Primary Key:** `(org_id, framework_id)`

#### `org_module`
Tracks which modules within a framework an organization has selected.

| Column | Type | Description |
|--------|------|-------------|
| org_id | UUID | Organization identifier (PK) |
| framework_id | TEXT | Framework ID (PK) |
| module_id | TEXT | Module ID like '1', '2', '3' (PK) |
| enabled_at | TIMESTAMPTZ | When module was enabled |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Primary Key:** `(org_id, framework_id, module_id)`

#### `document`
Stores document metadata and status for compliance documents.

| Column | Type | Description |
|--------|------|-------------|
| org_id | UUID | Organization identifier (PK) |
| framework_id | TEXT | Framework ID (PK) |
| module_id | TEXT | Module ID (PK) |
| sub_module_id | TEXT | Sub-module ID like '1.01' (PK) |
| sub_sub_module_id | TEXT | Sub-sub-module ID like '4.04.01' (PK, nullable) |
| title | TEXT | Document title |
| status | TEXT | 'draft' or 'ready' |
| content_key | TEXT | S3 key for document content |
| current_version | INTEGER | Current version number |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Primary Key:** `(org_id, framework_id, module_id, sub_module_id, sub_sub_module_id)`

## Design Principles

✅ **No Arrays or JSON Columns** - Clean relational design  
✅ **One Row Per Module** - Simple, predictable queries  
✅ **Org-Scoped** - All queries filtered by org_id  
✅ **No Foreign Keys** - Flexible, decoupled design  
✅ **No RBAC/RLS** - Application-level authorization  

## Connection Pooling

The application uses `pg` (node-postgres) with connection pooling:

- **Max Connections:** 20
- **Idle Timeout:** 30 seconds
- **Connection Timeout:** 2 seconds

See `lib/db/postgres.ts` for pool configuration.

## Migrations

Future migrations should be numbered sequentially:
- `001_primus_framework_schema.sql` - Initial schema
- `002_add_indexes.sql` - Add performance indexes
- `003_add_audit_fields.sql` - Add audit fields
- etc.

## Backup & Maintenance

AWS RDS provides automated backups. Configure:
- Daily automated backups
- Point-in-time recovery
- Multi-AZ deployment for production
- Performance Insights enabled

## Testing

To test the connection:

```typescript
import { query } from '@/lib/db/postgres';

const result = await query('SELECT NOW()');
console.log('Database connected:', result.rows[0]);
```

## Troubleshooting

### Connection Issues
- Verify security group allows inbound on port 5432
- Check VPC settings if running in AWS Lambda/ECS
- Verify SSL certificate settings

### Performance
- Monitor connection pool utilization
- Add indexes as needed based on query patterns
- Consider read replicas for high read workloads

## Support

For issues with the database schema or queries, check:
1. CloudWatch logs for PostgreSQL errors
2. Application logs in `lib/primus/db-helper.ts`
3. AWS RDS Performance Insights dashboard
