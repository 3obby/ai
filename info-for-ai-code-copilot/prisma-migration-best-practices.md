# Prisma Migration Best Practices for GCBB AI Companion Platform

## Naming Conventions

### Migration Names
- Use descriptive, action-oriented names: `add_user_profiles`, `enhance_companion_model`
- Include the affected models in the name: `update_companion_permissions`
- For multiple changes, use the most significant: `major_auth_system_refactor`

### Schema Field Naming
- Use camelCase consistently for all field names
- Suffix date fields with `At`: `createdAt`, `updatedAt`, `deletedAt`
- Suffix relationship fields with entity name: `userId`, `companionId`

## Safe Schema Evolution Patterns

### Adding New Fields
✅ **Safe**: Adding nullable fields or fields with defaults
```prisma
// Good - has default or nullable
model User {
  newField String? // Nullable
  newCounter Int @default(0) // Has default
}
```

❌ **Unsafe**: Adding required fields without defaults
```prisma
// Problematic - requires manual data migration
model User {
  newRequiredField String // No default, not nullable
}
```

### Modifying Fields
- Always use `--create-only` first to review SQL
- Add data migration logic when changing types
- Consider column size constraints (e.g., VARCHAR length)

### Removing Fields
- First mark as nullable and deploy
- Then create a second migration to remove

### Relations
- When changing relations, maintain referential integrity
- Use ON DELETE CASCADE/SET NULL appropriately
- Consider soft delete patterns for important data

## Migration Workflow

### Local Development
1. Make schema changes in small, logical commits
2. Run `npx prisma migrate dev --name descriptive_name`
3. For complex changes, use `--create-only` then edit the SQL

### Testing Migrations
- Create a script to test migrations against a copy of production data:

```ts
// scripts/test-migrations.ts
import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function testMigrations() {
  console.log('Testing migrations on copy of production data...');
  
  try {
    // Test the migration
    exec('DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy', 
      { env: { ...process.env } },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Migration test failed: ${error.message}`);
          process.exit(1);
        }
        console.log(`Migration successful: ${stdout}`);
      }
    );
  } catch (e) {
    console.error('Migration test failed', e);
    process.exit(1);
  }
}

testMigrations();
```

### Handling Production Data
- Backup before significant schema changes
- For large tables, consider batched migrations
- Schedule migrations during low-traffic periods

## Schema Optimization Techniques

### Indexing Strategy
- Index foreign keys: `@@index([userId])`
- Index frequently queried fields: `@@index([global])`
- Index sort fields: `@@index([createdAt])`
- Create compound indexes for common query patterns: `@@index([userId, global])`

### Enum Types
- Use Prisma enums for constrained values:
```prisma
enum Role {
  USER
  ADMIN
  MODERATOR
}
```

### JSON Fields
- Use for flexible, schema-less data
- Consider validation at application level
- Document expected structure in comments

## Automating Processes

### CI/CD Integration
- Run `npx prisma migrate deploy` in CI pipeline
- Add validation step before deployment:
```yaml
jobs:
  validate_migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx prisma validate
      - run: npm run test:migrations
```

### Monitoring Migrations
- Log migration events
- Alert on migration failures
- Set up database size/performance monitoring

## Data Migration Patterns

### Backfilling Data

Use Prisma Client in migration scripts:

```ts
// prisma/migrations/[timestamp]_migration_name/backfill.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfill() {
  const users = await prisma.user.findMany();
  
  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        metadata: { 
          migrated: true,
          previousState: 'imported' 
        }
      }
    });
  }
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run after migration: `node prisma/migrations/[timestamp]_migration_name/backfill.js`

### One-time Data Fixes
- Create script with clear purpose, date, and author
- Keep in source control for historical reference
- Include validation checks and error handling

## Documentation

### Schema Documentation
- Comment complex relations or business logic in schema
- Document constraints and indexes
- Explain non-obvious field purposes

### Migration Documentation
- Add clear comments to complex migrations
- Document manual steps if needed
- Create runbook for rollback procedures

## Rollback Strategies

### Emergency Rollback
1. Revert the schema change in code
2. Create down migration or restore from backup
3. Document in post-mortem

### Graceful Rollback
- Design features with backward compatibility
- Use feature flags to disable problematic code
- Consider schema versioning for major changes 