import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { SettingsModalProvider } from "@/hooks/use-settings-modal"
import { PromptsProvider } from "@/store/use-prompts"
import { Toaster } from "@/components/ui/toaster"
import { withAuth } from "@/lib/auth"
import NextAuthProvider from "@/components/providers/session-provider"
import { NavigationProgress } from "@/components/ui/navigation-progress"
import SWRProvider from "@/app/shared/components/SWRProvider"

// Force dynamic rendering for authentication
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ["latin"] })

// Get application URL safely
const getAppUrl = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelUrl = process.env.VERCEL_URL;
  
  if (appUrl) return new URL(appUrl);
  if (vercelUrl) return new URL(`https://${vercelUrl}`);
  return new URL("http://localhost:3000");
};

// Separate viewport configuration for Next.js 15
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "GCBB AI Companion - Your Personal AI Assistant",
  description: "Engage with customizable AI companions for productivity, learning, and entertainment. Access a variety of companions with unique personalities and knowledge domains.",
  metadataBase: getAppUrl(),
  manifest: "/site.webmanifest",
  keywords: [
    "AI",
    "GPT",
    "GCBB",
    "AI Companion",
    "Chat",
    "Companion",
    "Artificial Intelligence",
    "Conversation",
    "Assistant"
  ],
  authors: [
    {
      name: "GCBB Team",
    }
  ],
  creator: "GCBB Team",
  publisher: "GCBB",
  openGraph: {
    title: "GCBB AI Companion",
    description: "Engage with customizable AI companions for productivity, learning, and entertainment. Access a variety of companions with unique personalities and knowledge domains.",
    siteName: "GCBB AI Companion",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GCBB AI Companion",
    description: "Engage with customizable AI companions for productivity, learning, and entertainment. Access a variety of companions with unique personalities and knowledge domains.",
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get authentication state using our enhanced withAuth utility
  const { isAuthenticated, user } = await withAuth();

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
        
        {/* Explicit CSS loading for Next.js 15 - includes version to prevent caching issues */}
        <link rel="stylesheet" href={`/_next/static/css/app/layout.css?v=${Date.now()}`} />
      </head>
      <body className={cn("bg-secondary", inter.className)}>
        <SWRProvider>
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
        </SWRProvider>
      </body>
    </html>
  )
}
