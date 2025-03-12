import { redirect } from 'next/navigation';
import { withAuth } from '@/lib/auth';

type AuthWrapperProps = {
  children: React.ReactNode;
  redirectTo?: string;
  redirectIfAuthenticated?: string;
};

/**
 * Server component wrapper that handles authentication state and redirects
 * 
 * Example usage:
 * ```tsx
 * // Protected page that redirects to /login if not authenticated
 * export default async function ProtectedPage() {
 *   return (
 *     <AuthWrapper redirectTo="/login">
 *       <YourProtectedContent />
 *     </AuthWrapper>
 *   );
 * }
 * 
 * // Public page that redirects to /dashboard if already authenticated
 * export default async function PublicPage() {
 *   return (
 *     <AuthWrapper redirectIfAuthenticated="/dashboard">
 *       <YourPublicContent />
 *     </AuthWrapper>
 *   );
 * }
 * ```
 */
export async function AuthWrapper({
  children,
  redirectTo,
  redirectIfAuthenticated
}: AuthWrapperProps) {
  const { redirect: redirectPath } = await withAuth({
    redirectTo,
    redirectIfAuthenticated,
  });
  
  // Handle redirects if needed
  if (redirectPath) {
    redirect(redirectPath);
  }
  
  return <>{children}</>;
} 