import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { SettingsModalProvider } from "@/hooks/use-settings-modal"
import { PromptsProvider } from "@/store/use-prompts"
import { Toaster } from "@/components/ui/toaster"
import { auth } from "@/lib/server-auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GroupChatBotBuilder",
  description: "Create and chat with your AI companions",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get authentication state
  const session = await auth()
  const isAuthenticated = !!session?.userId

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={cn("bg-secondary", inter.className)}>
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
      </body>
    </html>
  )
}
