# Prisma Migration Guide for GCBB AI Companion Platform

## Current Situation
- Using `prisma db push` for database changes
- Broken/incomplete migration history
- Need for structured versioning as complexity grows

## Migration Strategy

### Option 1: Fresh Start with Migration History (Development)

```bash
# 1. Backup your current database (CRITICAL!)
pg_dump -U your_username -h your_host -d your_database > backup_$(date +%Y%m%d).sql

# 2. Remove existing migration folders
rm -rf prisma/migrations

# 3. Create an initial migration based on current schema
npx prisma migrate dev --name initial_schema

# 4. For future changes, always use migrate dev
npx prisma migrate dev --name descriptive_change_name
```

### Option 2: Baseline Current Schema (Production-Friendly)

```bash
# 1. Create a migration baseline from current database
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/$(date +%Y%m%d%H%M%S)_baseline.sql

# 2. Mark the migration as applied
npx prisma migrate resolve --applied $(ls prisma/migrations | sort | tail -n 1)

# 3. For future changes, use proper migrations
npx prisma migrate dev --name descriptive_change_name
```

### Option 3: Database Shadow with Vercel (Recommended for Your Setup)

Since you're using Vercel and have valuable live data in production, you can leverage Prisma's shadow database for safer migrations:

1. **Set up a shadow database in your Vercel project**:

```prisma
// In schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL") // Add this line
}
```

2. **Add the shadow database URL to your Vercel environment variables**
3. **Use Prisma Migrate commands in development**:

```bash
npx prisma migrate dev --name descriptive_change_name
```

### Automating with GitHub Actions for CI/CD

Create a `.github/workflows/prisma-migrations.yml` file:

```yaml
name: Prisma Migrations

on:
  push:
    branches: [main]
    paths:
      - 'prisma/schema.prisma'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Generate Prisma Client
        run: npx prisma generate
      - name: Apply migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Development Workflow Recommendations

1. **Schema Changes**:
   - Make changes to `schema.prisma`
   - Run `npx prisma migrate dev --name descriptive_name`
   - This creates a new migration file
   - Commit both schema and migration files

2. **Deployment**:
   - In CI/CD pipeline, use `npx prisma migrate deploy`
   - This applies pending migrations safely

3. **Working with Teams**:
   - Everyone pulls latest migrations
   - Run `npx prisma migrate dev` (no name) to apply
   - This ensures consistent schema across team members

4. **Handling Complex Migrations**:
   - Use `npx prisma migrate dev --create-only` to create migration files without applying
   - Edit the migration SQL file to add custom logic
   - Apply with `npx prisma migrate dev`

## Integrating with Next.js 14 App Router

Add a migration step to your build process:

```json
// In package.json
"scripts": {
  "build": "prisma migrate deploy && next build",
  "postinstall": "prisma generate"
}
```

## Testing Migrations

Create a migration testing script:

```js
// scripts/test-migrations.js
const { execSync } = require('child_process')

// Create temp database for testing
const testDbUrl = process.env.TEST_DATABASE_URL
console.log('Testing migrations on temporary database...')

try {
  // Push schema to test DB
  execSync(`DATABASE_URL=${testDbUrl} npx prisma migrate reset --force`, {
    stdio: 'inherit'
  })
  console.log('✅ Migrations applied successfully')
  process.exit(0)
} catch (error) {
  console.error('❌ Migration test failed', error)
  process.exit(1)
}
```

Add to your test workflow:
```bash
npm run test-migrations
```

## Prisma Migrate Commands Reference

- `npx prisma migrate dev`: Create and apply migrations in development
- `npx prisma migrate deploy`: Apply pending migrations in production
- `npx prisma migrate reset`: Reset database and apply all migrations
- `npx prisma migrate status`: Check migration status
- `npx prisma db pull`: Pull schema from existing database
- `npx prisma db push`: Push schema changes without migration history (avoid in production)

## Project-Specific Implementation Plan

### For Developers

1. **Initial Setup**:
   ```bash
   # Pull the latest code
   git pull
   
   # Install dependencies
   npm install
   
   # Create a shadow database in your Neon project
   # Then add to your .env file:
   # SHADOW_DATABASE_URL="postgresql://your-shadow-db-connection-string"
   ```

2. **Making Schema Changes**:
   ```bash
   # 1. Edit prisma/schema.prisma with your changes
   
   # 2. Generate and apply migration
   npm run db:migrate -- --name descriptive_name_of_change
   
   # 3. Test your changes locally
   npx next dev
   
   # 4. Commit both schema.prisma and the new migration files
   git add prisma/
   git commit -m "Add new feature to schema"
   ```

3. **Deployment Process**:
   - When pushed to main branch, the build process will:
     - Run `prisma migrate deploy` to safely apply pending migrations
     - Then build the Next.js application
   - No manual migration steps needed in production

### For New Team Members

1. **Getting Started**:
   ```bash
   # Clone the repository
   git clone [repository-url]
   
   # Install dependencies
   npm install
   
   # Set up your .env file with DATABASE_URL and SHADOW_DATABASE_URL
   
   # Apply all existing migrations to your local database
   npm run db:migrate
   ```

2. **Troubleshooting**:
   - If you encounter migration issues:
     ```bash
     # Check migration status
     npm run db:status
     
     # For a clean slate (caution: resets database)
     npm run db:reset
     ```

## Handling the Initial Migration for Your Project

Since your project already has manual migrations that are broken, follow these steps:

1. **Backup the Production Database**:
   ```bash
   # Use Neon's export feature or pg_dump
   pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql
   ```

2. **Reset the Migration History**:
   ```bash
   # Remove current migration folders
   rm -rf prisma/migrations/*
   
   # Create a baseline migration
   npx prisma migrate dev --name initial_schema
   ```

3. **Push to GitHub and Deploy to Vercel**:
   - The build command `prisma migrate deploy` will apply the migration to production

### Important Notes

- Always backup before major schema changes
- Add the SHADOW_DATABASE_URL to Vercel environment variables
- Use descriptive migration names that explain the change
- Don't use `prisma db push` for production changes 