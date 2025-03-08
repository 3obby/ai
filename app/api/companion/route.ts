import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import { checkSubscription } from "@/lib/subscription";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const XP_REQUIRED_FOR_CREATION = 100;

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
const user = session?.user;
    const body = await req.json();
    const { src, name, instructions, categoryId,private: isPrivate } = body;

    if (!user || !userId || !user.firstName) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!src || !name  || !instructions || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 });
    };

    // Check user's XP using UserUsage
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId: userId }
    });

    if (!userUsage || userUsage.availableTokens < XP_REQUIRED_FOR_CREATION) {
      return NextResponse.json({ 
        showProModal: true,
        requiredXP: XP_REQUIRED_FOR_CREATION,
        currentXP: userUsage?.availableTokens || 0
      }, { status: 402 });
    }


    // Check limits based on subscription pric
    // Ultimate plan (4999) has no limit, so no check needed

    // Create companion
    const companion = await prismadb.companion.create({
      data: {
        categoryId,
        userId: userId,
        userName: user.firstName,
        src,
        name,
        instructions,
        private: isPrivate,
      }
    });

    // Deduct XP after successful creation
    await prismadb.userUsage.update({
      where: { userId: userId },
      data: {
        availableTokens: userUsage.availableTokens - XP_REQUIRED_FOR_CREATION,
        totalSpent: {
          increment: XP_REQUIRED_FOR_CREATION
        }
      }
    });

    return NextResponse.json(companion);
  } catch (error) {
    console.log("[COMPANION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
};
