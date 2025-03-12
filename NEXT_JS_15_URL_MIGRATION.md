# Next.js 15 Migration Guide for URL Fetching

## Background

In Next.js 15, relative URLs are no longer valid inputs for the fetch API or URL constructor. All URLs must now be absolute.

## Solution

We've created two utilities to handle this issue:

1. **URL Helper Utility** (`lib/url-helper.ts`):
   - `getBaseUrl()`: Gets the application's base URL
   - `getAbsoluteUrl(path)`: Converts a relative path to an absolute URL
   - `fetchWithBaseUrl(path, options)`: A wrapper for fetch that automatically converts relative paths

2. **Axios Configuration** (`lib/axios-config.ts`):
   - Creates a pre-configured axios instance with baseURL automatically set
   - Handles both client and server environments
   - Provides consistent error handling

## Files Updated

- `app/actions/user-actions.ts`
- `app/(root)/(routes)/group-chat-start/page.tsx`
- `components/chat-header.tsx`

## Files That Need Updates

All components that use `fetch()` or `axios` with relative URLs need to be updated. Here's a partial list:

```
hooks/use-dashboard-data.ts
lib/subscription.ts
lib/hooks/use-client-auth.tsx
components/pro-modal.tsx
components/chat-config/ai-wizard.tsx
components/modals/add-companion-modal.tsx
components/chat-form.tsx
app/(root)/(routes)/companion/new/page.tsx
app/(root)/(routes)/companion/[companionId]/components/companion-form.tsx
app/(root)/(routes)/admin/dashboard/page.tsx
app/(root)/(routes)/vote/page.tsx
```

## How to Update Your Code

### For fetch API calls:

```tsx
// Before
const response = await fetch('/api/endpoint');

// After
import { fetchWithBaseUrl } from '@/lib/url-helper';
const response = await fetchWithBaseUrl('/api/endpoint');
```

### For axios calls:

```tsx
// Before
import axios from 'axios';
const response = await axios.get('/api/endpoint');

// After
import api from '@/lib/axios-config';
const response = await api.get('/api/endpoint');
```

### For direct URL operations:

```tsx
// Before
const url = `/api/endpoint?id=${id}`;

// After
import { getAbsoluteUrl } from '@/lib/url-helper';
const url = getAbsoluteUrl(`/api/endpoint?id=${id}`);
```

## Anonymous User Handling

When working with anonymous users:

1. Always include the userId parameter in API requests:
```tsx
const url = userId 
  ? getAbsoluteUrl(`/api/endpoint?userId=${userId}`)
  : getAbsoluteUrl('/api/endpoint');
```

2. Remember to pass the userId to navigation URLs for anonymous users:
```tsx
router.push(userId
  ? `/group-chat/${id}?userId=${userId}`
  : `/group-chat/${id}`
);
```

## Testing Your Changes

After updating, verify your application by:

1. Testing anonymous user flows
2. Testing authenticated user flows 
3. Testing all API endpoints
4. Checking console for any URL-related errors

This utility automatically handles both client-side and server-side environments.

## Database Optimizations

In addition to URL fixes, we've also:

1. Increased database query timeouts:
   - Anonymous users: 15 seconds (up from 6)
   - Authenticated users: 8 seconds (up from 3)

2. Improved caching for anonymous users:
   - TTL increased to 10 minutes (up from 5)
   - Better fallbacks for failed queries

3. Middleware Updates:
   - Updated runtime from 'experimental-edge' to 'edge'
   - Fixed cookie access for Next.js 15 compatibility

## Next.js Configuration Updates

In `next.config.js`, we've updated:
- Removed 'serverActions' from experimental settings (now default in Next.js 15)
- Updated 'serverExternalPackages' to 'serverComponentsExternalPackages'

## Additional Recommendations

1. Update your database connection string with optimized parameters:
   ```
   DATABASE_URL="postgres://...?sslmode=require&connection_limit=20&pool_timeout=20&connect_timeout=60&keepalives=1&keepalives_idle=60"
   ```

2. Run optimization scripts:
   ```bash
   npm run optimize-local
   npm run optimize-anon
   ```

3. Verify all server components are properly using `await` with:
   - `params` and `searchParams` objects before accessing their properties
   - `cookies()` function calls

4. Add fallback UI components for anonymous users when database queries fail 