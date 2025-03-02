import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"

import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ProModal } from "@/components/pro-modal"
import { SettingsModalProvider } from "@/hooks/use-settings-modal"
import { PromptsProvider } from "@/store/use-prompts"

import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GroupChatBotBuilder.AI",
  description: "Your customized GroupChatBotBuilder.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
          />
        </head>
        <body className={cn("bg-secondary", inter.className)}>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <PromptsProvider>
              <SettingsModalProvider>
                <ProModal />
                {children}
                <Toaster />
              </SettingsModalProvider>
            </PromptsProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
