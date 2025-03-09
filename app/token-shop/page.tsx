import { auth } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"

import TokenShopClient from "./components/token-shop-client"

export default async function TokenShopPage() {
  const session = await auth()
  const userId = session?.userId
  
  if (!userId) {
    return redirect("/")
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="max-w-5xl w-full">
        <TokenShopClient userId={userId} />
      </div>
    </div>
  )
} 