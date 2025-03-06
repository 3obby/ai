import { Webhook } from "svix"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

// Define a simple WebhookEvent type to replace Clerk's
interface WebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
    }>
  }
}

export async function POST(req: Request) {
  // Get the webhook signing secret from env vars
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    )
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Error occured", {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses } = evt.data

    // Get primary email address
    const primaryEmail = email_addresses[0]?.email_address

    if (!primaryEmail) {
      return new Response("No email address found", {
        status: 400,
      })
    }

    // Check if user already has usage record
    const existingUsage = await prisma.userUsage.findUnique({
      where: { userId: id },
    })

    // If no usage record exists, create one
    if (!existingUsage) {
      try {
        await prisma.userUsage.create({
          data: {
            userId: id,
            email: primaryEmail, // Save the email
            totalSpent: 0,
            availableTokens: 100, // Starting tokens
          },
        })

        console.log(`Created usage record for user ${id}`)
      } catch (error) {
        console.error("Error creating usage record:", error)
        return new Response("Error creating usage record", {
          status: 500,
        })
      }
    }
  }

  return new Response("Webhook processed successfully", {
    status: 200,
  })
}
