import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";
import { 
  DEFAULT_PERSONALITY_CONFIG, 
  DEFAULT_KNOWLEDGE_CONFIG, 
  DEFAULT_INTERACTION_CONFIG, 
  DEFAULT_TOOL_CONFIG,
  CompanionConfigType
} from "@/types/companion";

// Define extended companion type that includes our new config fields
interface CompanionWithConfig {
  id: string;
  userId: string;
  personalityConfig?: any;
  knowledgeConfig?: any;
  interactionConfig?: any;
  toolConfig?: any;
  [key: string]: any; // Allow other fields
}

export async function GET(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    if (!params.companionId) {
      return new NextResponse("Companion ID is required", { status: 400 });
    }

    const companion = await prismadb.companion.findUnique({
      where: {
        id: params.companionId,
      },
    }) as CompanionWithConfig; // Type assertion

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    const config: CompanionConfigType = {
      personality: companion.personalityConfig ? 
        JSON.parse(JSON.stringify(companion.personalityConfig)) : DEFAULT_PERSONALITY_CONFIG,
      knowledge: companion.knowledgeConfig ? 
        JSON.parse(JSON.stringify(companion.knowledgeConfig)) : DEFAULT_KNOWLEDGE_CONFIG,
      interaction: companion.interactionConfig ? 
        JSON.parse(JSON.stringify(companion.interactionConfig)) : DEFAULT_INTERACTION_CONFIG,
      tools: companion.toolConfig ? 
        JSON.parse(JSON.stringify(companion.toolConfig)) : DEFAULT_TOOL_CONFIG
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("[COMPANION_CONFIG_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth();
    const userId = session?.userId;
    const { companionId } = params;
    const body = await req.json();
    
    const { 
      personality, 
      knowledge, 
      interaction, 
      tools 
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!companionId) {
      return new NextResponse("Companion ID is required", { status: 400 });
    }

    // Validate ownership of the companion
    const companion = await prismadb.companion.findUnique({
      where: {
        id: companionId,
        userId: userId
      }
    });

    if (!companion) {
      return new NextResponse("Companion not found or unauthorized", { status: 404 });
    }

    // Update companion configuration
    const updatedCompanion = await prismadb.companion.update({
      where: {
        id: companionId
      },
      data: {
        // Use type assertion to allow the new fields
        personalityConfig: personality as any,
        knowledgeConfig: knowledge as any,
        interactionConfig: interaction as any,
        toolConfig: tools as any
      } as any
    });

    return NextResponse.json(updatedCompanion);
  } catch (error) {
    console.error("[COMPANION_CONFIG_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 