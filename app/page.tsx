import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="w-full py-4 px-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">GroupChatBotBuilder</h1>
          <div className="space-x-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Sign up</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Welcome to GroupChatBotBuilder
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Create, customize, and chat with your own AI companions. Build
                  your personalized group chats with powerful AI.
                </p>
              </div>
              <div className="space-x-4 mt-6">
                <Link href="/register">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Create Account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 items-center">
              <div className="rounded-lg border bg-background p-6 shadow-sm">
                <h3 className="text-xl font-bold">AI Companions</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Create unique AI companions with custom personalities
                </p>
              </div>
              <div className="rounded-lg border bg-background p-6 shadow-sm">
                <h3 className="text-xl font-bold">Group Chats</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Build collaborative spaces with multiple AI companions
                </p>
              </div>
              <div className="rounded-lg border bg-background p-6 shadow-sm">
                <h3 className="text-xl font-bold">Community</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Share and discover companions created by others
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-6 bg-background">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <p className="text-center text-sm leading-loose text-gray-500 dark:text-gray-400">
              © 2023 GroupChatBotBuilder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
