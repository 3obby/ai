import jwt from "jsonwebtoken"
import { ServerClient } from "postmark"
import prismadb from "./prismadb"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const postmarkClient = new ServerClient(process.env.POSTMARK_API_KEY || "")

export type MagicLinkPayload = {
  email: string
  exp: number
}

export async function createMagicLink(email: string): Promise<string> {
  // Check if user exists, if not create them
  const user = await prismadb.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
    },
  })

  // Create token that expires in 15 minutes
  const expiresIn = 15 * 60 // 15 minutes
  const payload: MagicLinkPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  }

  const token = jwt.sign(payload, JWT_SECRET)

  // Create the magic link URL
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${baseUrl}/api/auth/verify?token=${token}`
}

export async function sendMagicLinkEmail(email: string, link: string) {
  try {
    await postmarkClient.sendEmail({
      From: "no-reply@groupchatbotbuilder.com",
      To: email,
      Subject: "Your Magic Login Link",
      HtmlBody: `
        <html>
          <body>
            <h1>Welcome to GroupChatBotBuilder</h1>
            <p>Click the button below to sign in to your account:</p>
            <a href="${link}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Sign In</a>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request this email, you can safely ignore it.</p>
          </body>
        </html>
      `,
      TextBody: `Click here to log in: ${link}`,
    })
    return true
  } catch (error) {
    console.error("Error sending magic link email:", error)
    return false
  }
}

export function verifyMagicLink(token: string): MagicLinkPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MagicLinkPayload
    return decoded
  } catch (error) {
    console.error("Error verifying magic link token:", error)
    return null
  }
}

export async function getUserByEmail(email: string) {
  return prismadb.user.findUnique({
    where: { email },
  })
}

// Store the session in an httpOnly cookie
export function createSession(res: Response, user: any) {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })

  // Set cookie that expires in 7 days
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  res.headers.set(
    "Set-Cookie",
    `auth-token=${token}; Path=/; HttpOnly; SameSite=Strict; Expires=${expires.toUTCString()}`
  )
}

// Verify session from cookie
export function getSessionFromCookie(req: Request) {
  const cookies = req.headers.get("cookie")
  if (!cookies) return null

  const tokenCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith("auth-token="))
  if (!tokenCookie) return null

  const token = tokenCookie.split("=")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }
    return decoded
  } catch (error) {
    return null
  }
}

// Get current user from session
export async function getCurrentUser(req: Request) {
  const session = getSessionFromCookie(req)
  if (!session?.userId) return null

  const user = await prismadb.user.findUnique({
    where: { id: session.userId },
  })

  return user
}
