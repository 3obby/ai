import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const PUBLISH_TOKEN_COST = 100000;

export async function POST(req: Request) {
  try {
    const { companionId } = await req.json();
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!companionId) {
      return new NextResponse("Companion ID is required", { status: 400 });
    }

    // Check if the companion exists and belongs to the user
    const companion = await prismadb.companion.findUnique({
      where: {
        id: companionId,
        userId: userId,
      }
    });

    if (!companion) {
      return new NextResponse("Companion not found or you don't have permission", { status: 404 });
    }

    // Check if already published
    if (companion.private === false) {
      return new NextResponse("Companion is already published", { status: 400 });
    }

    // Check if user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: {
        userId: userId
      }
    });

    if (!userUsage || userUsage.availableTokens < PUBLISH_TOKEN_COST) {
      return new NextResponse(`Not enough tokens. Publishing requires ${PUBLISH_TOKEN_COST} tokens.`, { 
        status: 402 // Payment Required
      });
    }

    // Begin a transaction to update both the companion and user tokens
    const result = await prismadb.$transaction([
      // Update companion to public
      prismadb.companion.update({
        where: {
          id: companionId
        },
        data: {
          private: false
        }
      }),
      
      // Deduct tokens from user
      prismadb.userUsage.update({
        where: {
          userId: userId
        },
        data: {
          availableTokens: {
            decrement: PUBLISH_TOKEN_COST
          },
          // Add transaction through relation
          transactions: {
            create: {
              amount: PUBLISH_TOKEN_COST,
              type: "PUBLISH_COMPANION",
              description: `Published companion: ${companion.name}`
            }
          }
        }
      })
    ]);

    const updatedCompanion = result[0];
    
    return NextResponse.json(updatedCompanion);
  } catch (error) {
    console.error("[COMPANION_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 