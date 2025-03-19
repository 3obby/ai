"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLogin() {
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    if (
      (formData.get("email") === "GroupChatBotBuilder@ai.com" ||
        formData.get("email") === "admin") &&
      (formData.get("password") === "GroupChatBotBuilder@ai.com" ||
        formData.get("password") === "admin")
    ) {
      localStorage.setItem("isAdminAuthenticated", "true")
      localStorage.setItem("isAdmin", "true")
      router.push("/admin/dashboard")
    } else {
      setError("Invalid credentials")
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-foreground">
          Admin Login
        </h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
