import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Account - GroupChatBotBuilder",
  description: "Manage your account and subscription",
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      {children}
    </div>
  )
} 