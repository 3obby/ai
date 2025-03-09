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
import { NavigationProgress } from "@/components/ui/navigation-progress"

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GroupChatBotBuilder",
  description: "Create and deploy AI bot companions",
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      {
        media: '(prefers-color-scheme: light)',
        url: '/feather.png',
        href: '/feather.png',
      },
      {
        media: '(prefers-color-scheme: dark)',
        url: '/feather.png',
        href: '/feather.png',
      },
    ],
    shortcut: ['/feather.png'],
    apple: [
      { url: '/feather.png' },
      { url: '/feather.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: '/feather.png',
      },
    ],
  },
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
      <head>
        {/* Standard favicon */}
        <link rel="icon" href="/feather.png" type="image/png" />
        
        {/* Alternate favicon sizes */}
        <link rel="icon" href="/feather.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/feather.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/feather.png" sizes="96x96" type="image/png" />
        
        {/* iOS icons */}
        <link rel="apple-touch-icon" href="/feather.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/feather.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Browser-specific */}
        <meta name="msapplication-TileImage" content="/feather.png" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        <meta name="theme-color" content="#1f2937" />
      </head>
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
                <NavigationProgress />
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
