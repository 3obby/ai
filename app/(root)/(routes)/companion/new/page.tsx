"use client"

import { useEffect, useState } from "react"
import { redirect, useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"

import { CompanionForm } from "../[companionId]/components/companion-form"
import { Category } from "@prisma/client"

const NewCompanionPage = () => {
  const { userId } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        if (!response.ok) {
          throw new Error("Failed to fetch categories")
        }
        const data = await response.json()
        setCategories(data)
      } catch (error) {
        console.error("Error loading categories:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    if (!userId && !isLoading) {
      router.push("/login")
    }
  }, [userId, isLoading, router])

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (!userId) {
    return null
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-[#27272A] rounded-xl p-8 shadow-xl border border-slate-200 dark:border-zinc-700 backdrop-blur-sm">
          <CompanionForm initialData={null} categories={categories} />
        </div>
      </div>
    </div>
  )
}

export default NewCompanionPage
