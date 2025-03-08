import axios from "axios"
import SubscribeClient from "./components/subscribe-client"
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation"

export default async function SubscribePage() {
  const session = await auth()
  const userId = session?.userId

  if (!userId) {
    return redirect("/login")
  }

  return <SubscribeClient userId={userId} />
}
