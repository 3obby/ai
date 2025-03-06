import { cookies } from "next/headers"
import jwt from "jsonwebtoken"
import prismadb from "./prismadb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function getAuthSession() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth-token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

    if (!decoded?.userId) {
      return null
    }

    // @ts-ignore - Prisma model type issue
    const user = await prismadb.user.findUnique({
      where: {
        id: decoded.userId,
      },
    })

    if (!user) {
      return null
    }

    return {
      userId: user.id,
      user,
    }
  } catch (error) {
    console.error("Error getting auth session:", error)
    return null
  }
}

export async function auth() {
  return getAuthSession()
}

export function getServerAuthStatus() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) {
    return { isSignedIn: false, userId: null }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return { isSignedIn: !!decoded?.userId, userId: decoded?.userId || null }
  } catch (error) {
    return { isSignedIn: false, userId: null }
  }
}
