import { auth, currentUser } from "@clerk/nextjs"
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

const IDEA_SUBMISSION_COST = 20000

export async function POST(req: Request) {
  try {
    const user = await currentUser()
    const body = await req.json()
    const { title, description } = body

    if (!user || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Check user's available XP
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: user.id },
    })

    if (!userUsage || userUsage.availableTokens < IDEA_SUBMISSION_COST) {
      return new NextResponse(
        "Insufficient XP. Need 20,000 XP to submit an idea.",
        { status: 403 }
      )
    }

    // Create the idea and deduct XP
    const [idea] = await prismadb.$transaction([
      prismadb.communityIdea.create({
        data: {
          userId: user.id,
          title,
          description,
        },
      }),
      prismadb.userUsage.update({
        where: { userId: user.id },
        data: {
          availableTokens: userUsage.availableTokens - IDEA_SUBMISSION_COST,
          totalSpent: userUsage.totalSpent + IDEA_SUBMISSION_COST,
        },
      }),
    ])

    return NextResponse.json(idea)
  } catch (error) {
    console.log("[COMMUNITY_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const ideas = await prismadb.communityIdea.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(ideas)
  } catch (error) {
    console.log("[COMMUNITY_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
