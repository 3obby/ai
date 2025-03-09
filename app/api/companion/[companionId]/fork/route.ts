import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";

// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;
    const user = session?.user;

    if (!userId || !user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.companionId) {
      return new NextResponse("Companion ID required", { status: 400 });
    }

    // Get the original companion
    const originalCompanion = await prismadb.companion.findFirst({
      where: {
        id: params.companionId,
        private: false, // Can only fork public companions
      },
      include: {
        category: true,
      },
    });

    if (!originalCompanion) {
      return new NextResponse("Companion not found or is private", {
        status: 404,
      });
    }

    // Check if user already has a fork of this companion
    const existingFork = await prismadb.companion.findFirst({
      where: {
        userId,
        name: {
          contains: `Fork of ${originalCompanion.name}`,
        },
      },
    });

    if (existingFork) {
      return new NextResponse(
        "You already have a fork of this companion",
        { status: 409 }
      );
    }

    // Create a new companion as a fork
    const forkedCompanion = await prismadb.companion.create({
      data: {
        userId,
        userName: user.name || "User",
        src: originalCompanion.src,
        name: `Fork of ${originalCompanion.name}`,
        instructions: originalCompanion.instructions,
        private: true, // Forked companions are private by default
        categoryId: originalCompanion.categoryId,
        isFree: originalCompanion.isFree,
        messageDelay: originalCompanion.messageDelay,
        sendMultipleMessages: originalCompanion.sendMultipleMessages,
        customIntroduction: originalCompanion.customIntroduction,
        personalityConfig: originalCompanion.personalityConfig,
        knowledgeConfig: originalCompanion.knowledgeConfig,
        interactionConfig: originalCompanion.interactionConfig,
        toolConfig: originalCompanion.toolConfig,
      },
    });

    return NextResponse.json({
      success: true,
      companion: forkedCompanion,
      message: "Companion forked successfully",
    });
  } catch (error) {
    console.error("[COMPANION_FORK]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 