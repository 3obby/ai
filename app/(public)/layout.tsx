import { AuthWrapper } from "@/components/auth/auth-wrapper";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthWrapper redirectIfAuthenticated="/dashboard">
      {children}
    </AuthWrapper>
  );
}
