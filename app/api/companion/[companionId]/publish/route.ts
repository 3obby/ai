import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const PUBLISH_TOKEN_COST = 100000;

export async function POST(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.companionId) {
      return new NextResponse("Companion ID required", { status: 400 });
    }

    // Check if user has enough tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: {
        userId,
      },
    });

    if (!userUsage) {
      return new NextResponse("User usage record not found", { status: 404 });
    }

    if (userUsage.availableTokens < PUBLISH_TOKEN_COST) {
      return new NextResponse(
        `Not enough tokens. Publishing requires ${PUBLISH_TOKEN_COST} tokens.`,
        { status: 402 }
      );
    }

    // Check if the companion exists and belongs to the user
    const companion = await prismadb.companion.findFirst({
      where: {
        id: params.companionId,
        userId,
      },
    });

    if (!companion) {
      return new NextResponse("Companion not found or not owned by user", {
        status: 404,
      });
    }

    // Begin a transaction to update everything atomically
    const results = await prismadb.$transaction(async (tx) => {
      // Update the companion to make it public
      const updatedCompanion = await tx.companion.update({
        where: {
          id: params.companionId,
          userId,
        },
        data: {
          private: false,
        },
      });

      // Deduct tokens from user's available balance
      const updatedUserUsage = await tx.userUsage.update({
        where: {
          userId,
        },
        data: {
          availableTokens: {
            decrement: PUBLISH_TOKEN_COST,
          },
        },
      });

      // Create a transaction record for the token usage
      const transactionRecord = await tx.transaction.create({
        data: {
          amount: -PUBLISH_TOKEN_COST,
          type: "COMPANION_PUBLISH",
          description: `Published companion: ${companion.name}`,
          userUsageId: userUsage.id,
        },
      });

      return {
        updatedCompanion,
        updatedUserUsage,
        transactionRecord
      };
    });

    return NextResponse.json({
      success: true,
      companion: results.updatedCompanion,
      tokensRemaining: results.updatedUserUsage.availableTokens,
    });
  } catch (error) {
    console.error("[COMPANION_PUBLISH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 