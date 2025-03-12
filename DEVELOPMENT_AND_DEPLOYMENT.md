# Development and Deployment Guide

## Local Environment Setup

### Required Environment Variables
```
# Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_PRODUCTION=https://your-production-url.com

# Email provider
POSTMARK_API_KEY=

# OpenAI
OPENAI_API_KEY=

# Database
DATABASE_URL=postgresql://...
SHADOW_DATABASE_URL=postgresql://...

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STANDARD_PRICE_ID=

# Vercel Blob
VERCELBLOB_READ_WRITE_TOKEN=
```

### Installation Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (add to `.env`)
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
6. Start the development server:
   ```bash
   npx next dev
   ```

## Development Workflow

### Working with Database Changes
1. Make schema changes in `prisma/schema.prisma`
2. Create a migration:
   ```bash
   npm run db:migrate -- --name descriptive_name
   ```
3. Test locally:
   ```bash
   npx next dev
   ```
4. Commit both schema and migration files:
   ```bash
   git add prisma/
   git commit -m "Add schema changes"
   ```

### Troubleshooting Database Issues
- Check migration status:
  ```bash
  npx prisma migrate status
  ```
- Reset local database (CAUTION: clears data):
  ```bash
  npx prisma migrate reset
  ```
- Inspect current database schema:
  ```bash
  npx prisma db pull
  ```

## Deployment Process

### Vercel Deployment
1. Push changes to GitHub main branch
2. Vercel automatically deploys with:
   - `prisma migrate deploy` (applies migrations)
   - `next build` (builds Next.js application)

### Environment Variables for Production
Ensure these variables are set in Vercel dashboard:
- `DATABASE_URL`
- `SHADOW_DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL_PRODUCTION`
- `OPENAI_API_KEY`
- All Stripe API keys and configuration
- Blob storage configuration

### CI/CD Integration Example
```yaml
# .github/workflows/prisma-migrations.yml
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

## Project-Specific Commands

### Next.js Commands
```bash
# Development server
npx next dev

# Production build
npx next build

# Start production server
npx next start
```

### Database Commands
```bash
# Create migration
npm run db:migrate -- --name your_change

# Apply migrations
npx prisma migrate deploy

# Reset database (local development only)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Vercel Commands
```bash
# Install Vercel CLI
npm i -g vercel

# Link to Vercel project
vercel link

# Deploy to development
vercel

# Deploy to production
vercel --prod
```

## Important Notes
- Always build and verify locally before pushing to main
- Database has valuable live data - append-only to `.env`
- Next.js 15 app router conventions must be followed
- Always prefer Tailwind CSS classes exclusively for styling
- Enforce dark, modern aesthetic using theme classes
- Optimize for Server Components and efficient data fetching 

## Local Performance Optimization

### Performance Differences: Local vs. Production

When developing locally, you may notice that the dashboard loads significantly slower than in production (45+ seconds vs. 2-3 seconds). This is due to several factors:

1. **Missing Materialized Views**: Production uses materialized views for fast queries
2. **Database Connection Issues**: High latency or connection pool limitations
3. **Redis Cache Configuration**: Local Redis may not be configured optimally
4. **Missing Indexes**: Production has additional database indexes

### Running Optimized Local Development

We've created tools to make local development performance more similar to production:

```bash
# One-time setup to optimize your local environment
npm run optimize-local

# Always use this command for development after optimization
npm run dev:optimized

# For faster anonymous user handling
npm run dev:fast
```

### Anonymous User Performance Issues

If you're experiencing particularly slow anonymous user chat loading or seeing errors like:

```
Error: Cookies can only be modified in a Server Action or Route Handler.
```

Use our specialized anonymous optimization script:

```bash
npm run optimize-anon
```

This script:
1. Creates a persistent anonymous user in your database
2. Configures proper token usage
3. Sets up local caching
4. Adds performance flags to `.env.local`

This approach avoids the need to repeatedly create anonymous users and provides much faster performance for anonymous flows. After running the script, be sure to:

1. Clear your browser cookies for localhost
2. Restart your Next.js server

### Database Connection Issues

When using a remote database for local development, you may encounter database connectivity issues:

```
Can't reach database server at `...:5432`
Please make sure your database server is running at `...:5432`.
```

These issues can happen when:
1. Your network connection is unstable
2. VPN settings change
3. The database server has connection limits
4. Firewall rules block connections

We've implemented these solutions:

1. **Connection Retries**: The application will automatically retry database connections up to 5 times
2. **Fallback Components**: For anonymous users, basic functionality will still work even if the database is unreachable
3. **Connection Optimizations**: Added keepalive parameters to prevent connection drops

To enable or configure these features, set these variables in `.env.local`:

```
ENABLE_DB_CONNECTION_RETRIES=true
DB_MAX_RETRIES=5
DB_RETRY_DELAY_MS=1000
```

For database connection issues while developing:
1. Run `npm run optimize-anon` to set up optimal connection parameters
2. Check if your DATABASE_URL in `.env.local` includes proper connection timeout settings
3. Consider setting up a local database for unstable network environments

### Database Connectivity Troubleshooting

If you're experiencing persistent database connection issues, use our diagnostic tools:

```bash
# Run the database connectivity check tool
npm run db:check
```

This tool will:
1. Check DNS resolution for the database host
2. Test TCP connectivity to the database port
3. Verify database authentication
4. Analyze connection parameters
5. Provide specific recommendations for your environment

For intermittent connection issues, add these optimizations to your DATABASE_URL:

```
connect_timeout=60
keepalives=1
keepalives_idle=60
keepalives_interval=10
keepalives_count=6
statement_timeout=60000
idle_in_transaction_session_timeout=60000
```

Our `optimize-anon` script will automatically add these parameters.

If you still experience connection issues:
1. Try using an IP address instead of hostname in your DATABASE_URL
2. Check if your VPN settings are interfering with the connection
3. Consider setting up a local PostgreSQL database for development

### Optimization Scripts

Several scripts are available to help with performance optimization:

- `npm run optimize-local`: Sets up materialized views, indexes, and environment
- `npm run generate-cache`: Builds a static cache for anonymous users
- `npm run refresh-views`: Manually refreshes materialized views
- `npm run optimize-anon`: Optimizes anonymous user handling

### Monitoring Performance

Check the console logs for performance indicators:
- `[SLOW_QUERY]` markers identify queries taking longer than 500ms
- `Dashboard data loaded in XXXms` shows overall loading time

If you still experience slow performance, try:
1. Resetting your database with `npm run db:reset`
2. Running `npm run optimize-local` again
3. Check if your Redis instance is properly configured

## Extended API Architecture

### Core API Endpoints
- **Chat-Related APIs**:
  - `/api/chat/[chatId]`: Message exchange with streaming responses
  - `/api/chat-config`: Configuration templates and personalized chat settings
  - `/api/chat-config/templates`: Pre-defined chat configuration templates
  - `/api/chat-config/generate`: Dynamic configuration generation
  - `/api/chat-config/[configId]`: CRUD operations for specific chat configurations

- **Companion Management**:
  - `/api/companions`: List and filter companions with pagination and search
  - `/api/companion/[companionId]`: CRUD operations for specific companions
  - `/api/companion/[companionId]/publish`: Companion publishing workflow

- **Dashboard & Analytics**:
  - `/api/dashboard-data`: Optimized metrics retrieval with tiered caching
    - Anonymous users: 10-30 minute cache
    - Authenticated users: 1-minute cache
    - Rich metrics for personalized dashboards
  - `/api/user-progress`: Token usage statistics and level progression

- **Data Management**:
  - `/api/db/process-token-purchase`: Token economy transactions
  - `/api/db/process-subscription`: Subscription status management
  - `/api/db/process-payment`: Payment processing workflows
  - `/api/db/process-invoice`: Invoice generation and tracking

- **System Operations**:
  - `/api/cache`: Cache management (admin-only)
    - GET: Retrieve cached values
    - POST: Set cache values or invalidate patterns
    - DELETE: Clear specific cache keys or patterns

- **Community Features**:
  - `/api/vote`: Community voting system for features and ideas
  - `/api/vote/[ideaId]`: Vote on specific community ideas and submissions

### API Implementation Best Practices
- Use dynamic rendering for APIs that require fresh data
- Implement tiered caching based on user authentication status
- Apply role-based access controls for administrative endpoints
- Return standardized error responses with appropriate status codes
- Log performance metrics for optimization opportunities

## Redis Caching Architecture

### Redis Configuration
- **Hosting**: Vercel KV (Redis)
- **Connection**: Via `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables
- **Regions**: Functions in 3 regions with Vercel's Fluid Compute activated

### Cache Implementation Files
- **Standard Implementation**: `lib/redis-cache.ts`
- **Optimized Implementation**: `optimizations/optimized-redis-cache.ts`

### TTL Configuration
- **Anonymous Users**:
  - 600 seconds (10 minutes) in standard implementation
  - 1800 seconds (30 minutes) in optimized implementation
- **Authenticated Users**: 60 seconds (1 minute) in both implementations
- **No Caching**: Applied to critical data that must always be fresh

### Chunk Management
- **Standard Chunk Size**: 250KB in `redis-cache.ts`
- **Optimized Chunk Size**: 50KB in `optimized-redis-cache.ts` (can be configured via `REDIS_MAX_CHUNK_SIZE` env variable)
- **Purpose**: Prevents Redis memory issues and improves stability

### Optimization for Anonymous Users
- **Data Simplification**: Trims description fields to 40 characters
- **Payload Reduction**: Removes unnecessary performance data
- **Structure Simplification**: Only retains essential counts and metadata
- **Purpose**: Reduces Redis memory usage and improves cache hit rates

### Cache Invalidation Strategies
- **TTL-based**: Automatic expiration based on configured TTL values
- **Pattern-based**: Using `clearCachePattern()` to invalidate related keys
- **Versioning**: Support for cache versioning to enable global invalidation
- **Companion Update Triggers**: Automatic cache clearing when companions are updated

### Function Reference
- `setCacheWithChunking()`: Stores data with automatic chunking for large objects
- `getChunkedFromCache()`: Retrieves data, reassembling chunks if necessary
- `setCacheByUserType()`: Sets cache with appropriate TTL based on user type
- `clearCachePattern()`: Invalidates cache entries matching a pattern
- `setAnonymousCache()`: Legacy function for anonymous user caching 

## Companion Customization Architecture

### Customization Data Storage
- **Database Fields**:
  - `personalityConfig`: JSON field for personality settings
  - `knowledgeConfig`: JSON field for knowledge settings
  - `interactionConfig`: JSON field for interaction settings
  - `toolConfig`: JSON field for tool integration settings
  - `personality`: Legacy JSON field with default "{}"
  - `toolAccess`: String array for tool access control
  - `version`: Integer field for tracking configuration versions

### Component Structure
- **Primary Configuration Components**:
  - `CompanionConfigForm`: Main component at `components/companion-customization/config-form.tsx`
  - `PersonalityForm`: Personality settings at `components/companion-customization/personality-form.tsx`
  - `KnowledgeForm`: Knowledge settings at `components/companion-customization/knowledge-form.tsx`
  - `InteractionForm`: Interaction settings at `components/companion-customization/interaction-form.tsx`
  - `ToolForm`: Tool access at `components/companion-customization/tool-form.tsx`

### Type Definitions
- **Core Types** (defined in `types/companion.ts`):
  - `PersonalityConfigType`: Defines personality traits, voice attributes, response length and style
  - `KnowledgeConfigType`: Defines expertise areas, knowledge depth, confidence settings
  - `InteractionConfigType`: Defines conversation behavior and memory settings
  - `ToolConfigType`: Defines tool access and configuration
  - `CompanionConfigType`: Aggregates all configuration types

### Default Configurations
- Default settings are provided in `types/companion.ts`:
  - `DEFAULT_PERSONALITY_CONFIG`
  - `DEFAULT_KNOWLEDGE_CONFIG`
  - `DEFAULT_INTERACTION_CONFIG`
  - `DEFAULT_TOOL_CONFIG`

### Configuration Templates
- Predefined personality templates in `PERSONALITY_TEMPLATES` array:
  - Academic Expert: Formal and analytical
  - Friendly Tutor: Casual and supportive
  - Creative Collaborator: Imaginative and enthusiastic
  - Technical Expert: Precise and technically-focused

### Runtime Application
- Configurations are applied during chat in `app/api/chat/[chatId]/route.ts`
- Settings are converted to instruction strings that modify the base companion instructions
- Different settings are weighted differently in the instruction formation

### Development Guidelines
1. **Adding New Customization Fields**:
   - Add to relevant database model in `prisma/schema.prisma`
   - Define TypeScript interface in `types/companion.ts`
   - Create form inputs in the corresponding form component
   - Update API code to apply the setting at runtime

2. **Testing Customization**:
   - Create multiple companions with different settings
   - Compare responses to identical prompts
   - Verify settings persist after companion updates

3. **Performance Considerations**:
   - Large JSON fields may impact database performance
   - Consider indexing on frequently filtered configuration values
   - Implement caching for companion configurations

## Next.js 15 Migration Notes

### Breaking Changes and Fixes

#### Async Route Parameters
- In Next.js 15, dynamic route parameters (`params`) are now asynchronous and need to be awaited
- Update all API route handlers to extract and await params at the beginning:
  ```typescript
  export async function POST(
    request: Request,
    { params }: { params: { groupId: string } }
  ) {
    try {
      // In Next.js 15, we need to await the params object
      const { groupId } = await params;
      
      // Now use groupId instead of params.groupId
      // ...
    }
  }
  ```
- Error message to look for: `Route used params.XX. params should be awaited before using its properties`

#### Fixed Error with Async Route Parameters in Group Chat
- We encountered a specific error when an anonymous user was sending messages to group chats:
  ```
  Error: Route "/api/group-chat/[groupId]/chat" used `params.groupId`. `params` should be awaited before using its properties.
  ```
- The error occurred because Next.js 15 requires awaiting the params object before access
- We fixed this by:
  1. Extracting the groupId parameter at the beginning of the route handler
  2. Using the extracted parameter throughout the function instead of directly accessing params.groupId
  3. Making the same change in both the POST and DELETE handlers
  
Example fix:
```typescript
// Before (Next.js 14)
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: params.groupId, // This now causes an error in Next.js 15
      },
      // ...
    })
  }
}

// After (Next.js 15)
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  try {
    // Extract and await the params
    const { groupId } = await params;
    
    const groupChat = await prismadb.groupChat.findUnique({
      where: {
        id: groupId, // Now using the extracted parameter
      },
      // ...
    })
  }
}
```

#### Anonymous User Authentication
- The migration to Next.js 15 introduced changes to how relative URLs work
- When using anonymous authentication, make sure all API calls include the userId parameter:
  - Use the `userId` prop passed down from parent components
  - For anonymous users, always check cookies as fallback: `const anonymousUserId = userId || Cookies.get('anonymousUserId')`
  - Include this in query parameters: `?userId=${anonymousUserId}`
  - For POST requests, include it in request body: `{ userId: anonymousUserId }`

#### Chat Feature Fixes
- Fixed issue with creating group chats for anonymous users (401 Unauthorized error)
- Ensure `userId` is passed to the ChatClient component in page routes
- Updated onCreateGroupChat function to include userId from props or cookies when making API requests
- Fixed 400 Bad Request error in group chat creation:
  - Updated the API parameter name from `initialMessages` to `chatHistory` to match the server's expectations
  - Enhanced the server-side code to properly check for userId in request body and query parameters
  - Added explicit error handling for missing userId parameter

#### Group Chat Integration for Anonymous Users
- Anonymous users can now properly create and access group chats
- Required changes to support this functionality:
  - API routes need to check for userId in multiple places: auth session, URL query parameters, and request body
  - Client code must include userId consistently in both request bodies and query parameters
  - Parameter names must match exactly between client and server
- Fixed 400 Bad Request error when sending messages in group chats:
  - Updated client to send `prompt` instead of `message` in the request body
  - Also updated server to accept both parameter names for backward compatibility
  - Ensured userId is properly passed in query parameters

#### URL Handling
- Next.js 15 requires absolute URLs for fetch operations
- Use the `getAbsoluteUrl` helper function from `lib/url-helper.ts` for all API routes
- When using axios, configure the baseURL as shown in `lib/axios-config.ts`

## Database Configuration

When running locally but connecting to the production database:

1. Use the following connection string format in your `.env.local`:
   ```
   DATABASE_URL="postgres://neondb_owner:password@hostname-pooler.region.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=10&connect_timeout=60"
   ```

2. For optimal performance with Neon:
   - Use connection pooling (`pgbouncer=true`)
   - Set appropriate timeouts for queries and idle connections

## Network Timeout Issues

If you encounter network timeout errors connecting to external services:

1. Make sure you have a stable internet connection
2. Check your firewall settings for connections to external services 
3. Try increasing the timeout values in `.env.local`:
   ```
   NETWORK_RETRY_COUNT=3
   NETWORK_RETRY_DELAY=1000
   ```

4. For CDN issues (like `cdn.jsdelivr.net` timeouts), consider:
   - Using local copies of essential libraries
   - Implementing a proxy for external resources
   - Adding a fallback mechanism for critical resources

## Development Workflow

1. Always build and check for errors before committing changes:
   ```bash
   npm run build
   ```

2. Handle breaking Next.js changes with care by reviewing the official migration guides
3. Document any workarounds or fixes in this file

## Next.js 15 Authentication Model

Next.js 15 introduced async request APIs, including for authentication functions. This project uses a modular authentication approach that properly handles async requests in Next.js 15:

### Authentication Utilities

- `lib/auth.ts` provides several utilities for handling authentication:
  - `auth()`: The base authentication function (must be awaited)
  - `withAuth()`: A higher-level utility that handles auth state and redirects
  - `getUserIdForApi()`: A utility specifically for API routes that handles both logged-in and anonymous users

### Server Component Authentication

For server components that need authentication:

```tsx
// Example of a protected page component
import { withAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedPage() {
  // Get auth state with proper awaiting
  const { isAuthenticated, userId, redirect: redirectPath } = await withAuth({
    redirectTo: '/login'
  });
  
  // Handle redirects if needed
  if (redirectPath) {
    redirect(redirectPath);
  }
  
  // Rest of the component logic...
  return <div>Protected content for user {userId}</div>;
}
```

### Using AuthWrapper Component

For simpler cases, you can use the AuthWrapper component:

```tsx
import { AuthWrapper } from '@/components/auth/auth-wrapper';

// Public page that redirects to dashboard if authenticated
export default function PublicPage() {
  return (
    <AuthWrapper redirectIfAuthenticated="/dashboard">
      <YourPublicContent />
    </AuthWrapper>
  );
}

// Protected page that redirects to login if not authenticated
export default function ProtectedPage() {
  return (
    <AuthWrapper redirectTo="/login">
      <YourProtectedContent />
    </AuthWrapper>
  );
}
```

### API Route Authentication

API routes should use the `getUserIdForApi()` utility:

```ts
import { getUserIdForApi } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Get user ID and authentication status
  const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);
  
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  
  // Handle authenticated vs anonymous users differently
  if (isAnonymous) {
    // Apply rate limiting or other restrictions for anonymous users
  }
  
  // Rest of the API handler...
}
```

This approach ensures proper handling of authentication in Next.js 15 with its new async request APIs requirements.

## Anonymous User Authentication

Next.js 15 requires proper authentication handling, especially for anonymous users. We've implemented a modular system that handles both registered and anonymous users consistently:

### Anonymous Group Chat Access

Anonymous users now have full access to group chat functionality:

1. **Anonymous User ID Generation**:
   - When an anonymous user visits the site, a UUID is generated and stored in both localStorage and cookies
   - This ID is created via the `/api/auth/anonymous` endpoint, which handles cookie setting properly in Next.js 15

2. **Token Allocation**:
   - Anonymous users are allocated tokens automatically
   - These tokens allow creating and participating in group chats

3. **API Authentication Flow**:
   - All API routes use the `getUserIdForApi` utility from `@/lib/auth`
   - This utility automatically detects anonymous users via URL query parameters or cookies
   - Example usage in API routes:

```typescript
// Use our utility function to get user ID and auth status
const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);

if (!userId) {
  return new NextResponse("Unauthorized", { status: 401 });
}

// Continue with authorized request handling...
```

4. **Client-Side Implementation**:
   - The client passes the anonymous user ID in API requests
   - Example usage in client components:

```typescript
// Get effective user ID from either session or anonymous ID
const effectiveUserId = session?.user?.id || getAnonymousUserId();

// Pass userId in API requests
const response = await api.post("/api/group-chat", {
  name: groupName,
  initialCompanionId: selectedCompanion,
  userId: effectiveUserId 
});
```

5. **Anonymous Session Persistence**:
   - Anonymous sessions are maintained via cookies
   - The app uses both cookies and localStorage for redundancy
   - This ensures a consistent experience across browser sessions

This implementation ensures that both registered and anonymous users have a consistent experience with group chats without unauthorized errors.

### Anonymous Group Chat Access Troubleshooting

If you encounter 401 Unauthorized errors with anonymous users when creating group chats or accessing API endpoints, ensure all of the following:

1. **Consistent userId Parameter Usage**:
   - Always pass the anonymous userId consistently in both URL query parameters and request bodies
   - Example in client components:
   
```typescript
// When fetching companion messages for group chat creation
const messagesResponse = await api.get(`/api/companion/${companion.id}/messages`, {
  params: {
    limit: 20,
    userId: userId // Always explicitly include userId parameter
  }
});

// When creating the group chat
const groupResponse = await api.post(`/api/group-chat`, {
  name: name,
  initialCompanionId: companion.id,
  initialMessages: latestMessages.slice(-5), 
  userId: userId // Always explicitly include userId parameter
});
```

2. **Check API Implementations**:
   - Use the `getUserIdForApi` utility across all API routes that need user authentication
   - Focus on these key API endpoints for group chat functionality:
     - `/api/companion/[companionId]/messages` 
     - `/api/group-chat`
     - `/api/group-chat/[groupId]/members`
     - `/api/group-chat/[groupId]/members/[companionId]`
     - `/api/group-chat/[groupId]/chat`

3. **API Authentication Pattern**:
   - All API routes should follow this consistent pattern:

```typescript
// At the top of each API route handler
const { userId, isAuthenticated, isAnonymous } = await getUserIdForApi(request);

if (!userId) {
  return new NextResponse("Unauthorized", { status: 401 });
}

// Continue with API logic using userId...
```

Remember that anonymous users must have tokens allocated via the `/api/auth/anonymous` endpoint before they can use API endpoints that require tokens, such as group chat creation.

## Enhanced Modular Authentication System

As of [current date], we've implemented a more robust authentication system that handles both registered and anonymous users across all API endpoints:

### Next.js 15 Authentication Update (2023-10-15)

As part of the Next.js 15 upgrade, we've standardized authentication handling across all API routes:

1. **Consolidated Authentication Utilities**: 
   - Replaced older `getApiAuth` with unified `getUserIdForApi` from `lib/auth.ts`
   - Fixed 401 errors for anonymous users in group chat creation by ensuring consistent handling of user IDs

2. **Anonymous User Compatibility**:
   - All API endpoints now properly check for userId from both authenticated sessions and URL parameters
   - Fixed issue where companion message endpoints would return 401 for anonymous users
   - Always include userId in API calls from client for anonymous flows

3. **Client-Side Best Practices**:
   - When making API calls, always explicitly include userId parameter:
   ```typescript
   // Always include userId directly, not conditionally
   const response = await api.get('/api/endpoint', {
     params: {
       userId: userId, // Include for anonymous users
     }
   });
   ```

### Modular API Authentication

The new system uses a centralized authentication utility in `lib/api-auth.ts`:

```typescript
// Example usage in API routes
import { getApiAuth } from "@/lib/api-auth";

export async function GET(request: Request) {
  // Get comprehensive auth info
  const { userId, isAuthenticated, isAnonymous, hasValidToken } = await getApiAuth(request);
  
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  
  // Continue with API logic...
}
```

### Key Features

1. **Multi-Source User ID Detection**:
   - Extracts anonymous user IDs from multiple sources in order of precedence:
     - URL query parameters (`?userId=...`)
     - Custom HTTP headers (`x-anonymous-user-id`)
     - Cookies (`anonymousUserId`)
     - Request body (for POST/PUT requests)

2. **Simple Error Handling**:
   - The `requireAuth` helper function provides a clean way to ensure user authorization:
   ```typescript
   import { requireAuth } from "@/lib/api-auth";
   
   export async function POST(request: Request) {
     try {
       const userId = await requireAuth(request);
       // User is authenticated, continue...
     } catch (error) {
       return new NextResponse("Unauthorized", { status: 401 });
     }
   }
   ```

3. **Consistent Client Implementation**:
   - Client-side code should pass the user ID in multiple ways for redundancy:
   ```typescript
   // Example client code
   const params = { limit: 20 };
   if (userId) {
     params.userId = userId;
     api.defaults.headers.common['x-anonymous-user-id'] = userId;
   }
   
   const response = await api.get('/api/some-endpoint', { params });
   ```

This enhanced system ensures that anonymous users have a consistent experience across all API endpoints without encountering unauthorized errors.