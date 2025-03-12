# Database Maintenance Guide

This document outlines database maintenance procedures for the GCBB AI Companion Platform.

## Materialized Views

The application uses materialized views for improved performance:

- `mv_dashboard_companions`: Caches companion data to speed up dashboard loading

### Common Issues

1. **Missing columns in materialized view**
   - Error: `column "description" does not exist`
   - Cause: Schema changes not reflected in the materialized view
   - Solution: Run the fix script (see below)

2. **Stale dashboard data**
   - Cause: Materialized view not refreshed after data changes
   - Solution: Run the refresh script (see below)

## Maintenance Commands

We provide a unified script for database maintenance:

```bash
# Show help
node scripts/maintain-db.js --help

# Fix missing columns or repair corrupted views
node scripts/maintain-db.js --fix-views

# Refresh views with latest data
node scripts/maintain-db.js --refresh-views

# Clear Redis cache for dashboard data
node scripts/maintain-db.js --clear-cache

# Run all maintenance operations
node scripts/maintain-db.js --all
```

## Scheduled Maintenance

The materialized view is refreshed on a schedule via the `/api/cron/refresh-views` endpoint.

To manually trigger a refresh:

```bash
curl -X GET "https://yourdomain.com/api/cron/refresh-views?auth=YOUR_CRON_SECRET"
```

## Deployment Recommendations

1. **After Schema Changes**: Run `--fix-views` to update materialized views
2. **After Content Updates**: Run `--refresh-views` to update materialized views
3. **After View Issues**: Run `--clear-cache` to ensure clients get fresh data

## Troubleshooting

If you encounter database-related errors:

1. Check server logs for specific error messages
2. Run `node scripts/maintain-db.js --all` to fix common issues
3. Verify that the schema matches the view definition
4. For persistent issues, consider rebuilding the view manually:

```sql
DROP MATERIALIZED VIEW IF EXISTS "mv_dashboard_companions";

CREATE MATERIALIZED VIEW "mv_dashboard_companions" AS
SELECT 
  c.id, 
  c.name, 
  c.src, 
  c.description,
  c."categoryId", 
  c."userId",
  c.private,
  c."userName", 
  c."tokensBurned",
  c."createdAt",
  c."isFree",
  c.global,
  c.views,
  c.votes,
  COUNT(m.id) as message_count
FROM "Companion" c
LEFT JOIN "Message" m ON c.id = m."companionId"
WHERE c.private = false OR c."userId" = 'system'
GROUP BY c.id, c.name, c.src, c.description, c."categoryId", c."userId", c.private, c."userName", 
        c."tokensBurned", c."createdAt", c."isFree", c.global, c.views, c.votes
ORDER BY c."createdAt" DESC;
```

## Performance Considerations

- Refreshing materialized views can be resource-intensive
- Schedule refreshes during low-traffic periods
- Consider incremental updates for large datasets
- Monitor query performance with pg_stat_statements 