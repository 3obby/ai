import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { SettingsModalProvider } from "@/hooks/use-settings-modal"
import { PromptsProvider } from "@/store/use-prompts"
import { Toaster } from "@/components/ui/toaster"
import { auth } from "@/lib/auth"
import NextAuthProvider from "@/components/providers/session-provider"

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GroupChatBotBuilder",
  description: "Create group chats with AI characters",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get authentication state
  const session = await auth()
  const isAuthenticated = !!session?.user?.id

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn("bg-secondary", inter.className)}>
        <NextAuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <PromptsProvider>
              <SettingsModalProvider>
                {children}
              </SettingsModalProvider>
            </PromptsProvider>
            <Toaster />
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
