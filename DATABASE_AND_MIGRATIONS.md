# Database Configuration and Migration Strategy

## Current Database Architecture
- **Production Database**: PostgreSQL hosted on Vercel via Neon
  - Contains valuable live user data
  - Connected via `DATABASE_URL` environment variable
- **Shadow Database**: Secondary PostgreSQL for migration validation
  - Configured via `SHADOW_DATABASE_URL` environment variable
  - Used by Prisma to validate migrations before applying

## Prisma ORM Integration
- Using Prisma ORM v6.4.1 for database access
- Schema defined in `prisma/schema.prisma`
- Migration history in `prisma/migrations/` directory

## Token Tracking and Usage
- User token usage tracked in `UserUsage` table
- Direct 1:1 token burning rate for inference token usage
- Token transactions recorded in `UsageTransaction` table
- Companion token usage tracked in companion model as `tokensBurned`

## Safe Migration Process
1. **Creating Migrations**:
   ```bash
   # Create a migration with a descriptive name
   npm run db:migrate -- --name descriptive_name_of_change
   ```

2. **Deployment Process**:
   - Migrations to production handled by Vercel build process
   - Every push to main triggers `prisma migrate deploy`
   - Zero downtime through shadow database validation

3. **Schema Drift Management**:
   - For local development: `npx prisma migrate reset` (clears local data)
   - For production: Create migration that aligns schema with current state
   - Use `IF NOT EXISTS` for index creation to avoid conflicts

## Database Performance Optimizations
1. **Message Model Optimizations**:
   - Compound indexes: `[companionId, createdAt]`, `[companionId, userId]`, `[companionId, userId, createdAt]`

2. **GroupChat Optimizations**:
   - Index for creator + creation time: `[creatorId, createdAt]`

3. **GroupMessage Optimizations**:
   - Compound indexes: `[groupChatId, createdAt]`, `[groupChatId, senderId]`, `[groupChatId, isBot]`, `[groupChatId, senderId, createdAt]`

4. **Planned Optimizations**:
   - Materialized views for dashboard data with refresh functions
   - Partial indexes for common query patterns
   - Query timeouts to prevent slow queries

## Redis Caching Strategy
- **Cache TTL Strategy**:
  - Anonymous users: 300 seconds (5 minutes)
  - Authenticated users: 60 seconds (1 minute)
  - Critical data: No caching

- **Cache Invalidation**:
  - Automatic expiration via TTL
  - Pattern-based invalidation through `clearCachePattern`
  - Companion updates trigger related cache clearing

- **Optimization Techniques**:
  - Chunking support for large responses
  - Enhanced caching for anonymous users
  - Pipelined operations for better Redis performance

## Migration Commands Reference
```bash
# Create a new migration (safe approach)
npm run db:migrate -- --name descriptive_name_of_change

# Apply migrations (done automatically by Vercel)
npx prisma migrate deploy

# Reset local development database (CAUTION: deletes data)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Inspect database schema state
npx prisma db pull

# Check migration status
npx prisma migrate status
```

## Best Practices for Schema Changes
1. **Non-destructive Changes Only**:
   - Use additive changes (new tables, columns, indexes)
   - Never delete columns or tables directly in production
   - Mark fields as optional before removing in future

2. **Testing Migrations**:
   - Test on copy of production data before deploying
   - Verify query performance before and after changes

3. **Emergency Rollback Plan**:
   - Neon database allows point-in-time recovery
   - Create new migration to revert problematic changes
   - In extreme cases, restore from backup via Vercel 

## Companion Customization Schema

### JSON Fields in Companion Model
- **Schema Implementation**:
  ```prisma
  model Companion {
    // Basic fields
    id                   String    @id @default(uuid())
    // ... other fields ...
    
    // Customization JSON fields
    personalityConfig    Json?     // Stores personality settings
    knowledgeConfig      Json?     // Stores knowledge settings
    interactionConfig    Json?     // Stores interaction settings
    toolConfig           Json?     // Stores tool integration settings
    
    // Legacy/additional fields
    personality          Json?     @default("{}")
    toolAccess           String[]  @default([])
    version              Int       @default(1)
    
    // ... relationships and indexes ...
  }
  ```

### Optimization Considerations
- **Query Performance**:
  - JSON fields are not directly indexable in PostgreSQL
  - For frequent filtering, consider extracting key attributes to dedicated columns
  - Use `@> JSONB` operator for basic filtering when needed

- **Storage Efficiency**:
  - Consider compression techniques for large JSON objects
  - Monitor database size growth over time
  - Implement cleanup for abandoned drafts

### Migration Strategy for Customization Fields
1. **Adding New Fields**:
   ```sql
   -- Example migration to add a new field
   ALTER TABLE "Companion" ADD COLUMN IF NOT EXISTS "newConfigField" JSONB;
   ```

2. **Schema Evolution**:
   - When modifying JSON structure, ensure backward compatibility
   - Version field tracks schema changes
   - API endpoints should handle both old and new formats

3. **Data Migration**:
   - Use Prisma migrations with raw SQL for data transformation
   - Example:
   ```typescript
   // In migration.sql
   UPDATE "Companion" 
   SET "personalityConfig" = jsonb_set(
     COALESCE("personalityConfig"::jsonb, '{}'::jsonb),
     '{newAttribute}',
     '"defaultValue"'
   );
   ```

### Data Validation
- Implement validation at API level using Zod schemas
- Consider database triggers for critical validation
- Maintain type safety between database and application code 

## Connecting to Live Database in Local Development

To effectively use the live Neon database in local development:

1. Configure your `.env.local` file with optimized connection parameters:

```
DATABASE_URL="postgres://neondb_owner:npg_apTmUkK7u2st@ep-shiny-paper-a59b051p-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=10&connect_timeout=60&application_name=local_dev&keepalives=1&keepalives_idle=60&keepalives_interval=10&keepalives_count=6&statement_timeout=60000&idle_in_transaction_session_timeout=60000&pgbouncer=true"

# Also include your Redis settings for live connection
KV_REST_API_URL="https://liked-oriole-61488.upstash.io"
KV_REST_API_TOKEN="AfAwAAIjcDE4OWNmZTU1YTkyOTY0ZGU1OTIyN2JjNGY1ZGEzZjJlYnAxMA"
```

2. For optimal performance with Neon's serverless PostgreSQL:
   - Use connection pooling with `pgbouncer=true` parameter
   - Set appropriate timeouts with `connect_timeout=60`
   - Enable keepalives to prevent connection drops
   - Configure statement timeout for runaway queries
   - Use idle transaction timeout to release locked connections

3. Enable connection retry logic for more resilient connections:
   ```
   ENABLE_DB_CONNECTION_RETRIES=true
   DB_MAX_RETRIES=5
   DB_RETRY_DELAY_MS=1000
   ```

## Performance Optimization

When dealing with network latency to a remote database:

1. Implement caching strategies for frequently accessed data
2. Reduce the number of queries by combining related requests 
3. Use connection pooling to avoid the overhead of establishing new connections
4. Consider read replicas for heavy read operations
5. Use optimistic UI updates to improve perceived performance

## Troubleshooting Database Connection Issues

If you encounter connection issues:

1. **Check Network Connectivity**: Ensure your network allows outbound connections to Neon's IP ranges and ports.

2. **Verify Credentials**: Confirm your database credentials are correct in your `.env.local` file.

3. **Connection Pooling Settings**: Adjust the connection pooling parameters if you're experiencing timeouts:
   ```
   # Increase connection limits for high traffic
   &connection_limit=20
   # Increase pool timeout for slower connections
   &pool_timeout=20
   ```

4. **Implement Connection Retry Logic**: Add retry logic to handle transient connection issues.

5. **Use Fallback Mechanisms**: For anonymous users, provide a fallback experience if the database connection fails.

6. **Optimize Query Performance**: Ensure your queries are efficient by adding appropriate indexes and avoiding N+1 query patterns.

## Database Migration Best Practices

When making schema changes:

1. Use Prisma migrations for all schema changes
2. Test migrations on a staging database before applying to production
3. Document breaking changes and data transformations
4. Consider backward compatibility for critical fields
5. Include rollback plans for complex migrations

## Connection Issues with External Resources

For CDN timeouts (like `cdn.jsdelivr.net`):

1. Use local copies of essential JavaScript libraries
2. Implement a proxy for external resources if needed
3. Add timeout handling and retry logic for external services 