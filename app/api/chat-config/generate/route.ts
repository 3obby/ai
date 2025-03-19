import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import prismadb from "@/lib/prismadb";
import { 
  ResponseOrderingType, 
  SessionPersistenceType, 
  InputConsiderationType,
  ToolPermissionType
} from "@/types/chat-config";

// POST /api/chat-config/generate - Generate a chat configuration using AI
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { prompt, companionId, groupChatId } = body;

    if (!prompt) {
      return new NextResponse("Prompt is required", { status: 400 });
    }

    // In a real implementation, this would use OpenAI to generate a configuration
    // based on the user's prompt. For now, we'll use a simple rule-based approach.

    // Extract keywords from the prompt
    const promptLower = prompt.toLowerCase();
    
    // Determine response ordering
    let responseOrdering = ResponseOrderingType.ROUND_ROBIN;
    if (promptLower.includes("parallel") || promptLower.includes("all at once") || promptLower.includes("simultaneously")) {
      responseOrdering = ResponseOrderingType.PARALLEL;
    } else if (promptLower.includes("custom order") || promptLower.includes("specific order")) {
      responseOrdering = ResponseOrderingType.CUSTOM_ORDER;
    } else if (promptLower.includes("conditional") || promptLower.includes("depending on")) {
      responseOrdering = ResponseOrderingType.CONDITIONAL_BRANCHING;
    }
    
    // Determine session persistence
    let sessionPersistence = SessionPersistenceType.PERSISTENT;
    if (promptLower.includes("one time") || promptLower.includes("single session") || promptLower.includes("temporary")) {
      sessionPersistence = SessionPersistenceType.ONE_TIME;
    } else if (promptLower.includes("scheduled") || promptLower.includes("recurring")) {
      sessionPersistence = SessionPersistenceType.SCHEDULED;
    }
    
    // Determine input consideration
    let inputConsideration = InputConsiderationType.USER_ONLY;
    if (promptLower.includes("all messages") || promptLower.includes("bot messages") || promptLower.includes("see other bots")) {
      inputConsideration = InputConsiderationType.USER_AND_BOTS;
    } else if (promptLower.includes("selected") || promptLower.includes("specific participants")) {
      inputConsideration = InputConsiderationType.SELECTED_PARTICIPANTS;
    }
    
    // Determine tool permissions
    const toolPermissions: ToolPermissionType[] = [];
    if (promptLower.includes("web") || promptLower.includes("search") || promptLower.includes("internet")) {
      toolPermissions.push(ToolPermissionType.WEB_SEARCH);
    }
    if (promptLower.includes("api") || promptLower.includes("external service")) {
      toolPermissions.push(ToolPermissionType.EXTERNAL_API);
    }
    if (promptLower.includes("vector") || promptLower.includes("database") || promptLower.includes("knowledge base")) {
      toolPermissions.push(ToolPermissionType.VECTOR_DB);
    }
    if (promptLower.includes("code") || promptLower.includes("execute") || promptLower.includes("run")) {
      toolPermissions.push(ToolPermissionType.CODE_EXECUTION);
    }
    if (promptLower.includes("file") || promptLower.includes("document") || promptLower.includes("access my")) {
      toolPermissions.push(ToolPermissionType.FILE_ACCESS);
    }
    
    // Determine compute intensity (1-10)
    let computeIntensity = 5;
    if (promptLower.includes("thorough") || promptLower.includes("detailed") || promptLower.includes("comprehensive")) {
      computeIntensity = 8;
    } else if (promptLower.includes("quick") || promptLower.includes("brief") || promptLower.includes("concise")) {
      computeIntensity = 3;
    }
    if (promptLower.includes("token") || promptLower.includes("cost")) {
      if (promptLower.includes("save") || promptLower.includes("efficient") || promptLower.includes("less")) {
        computeIntensity = Math.max(2, computeIntensity - 2);
      } else if (promptLower.includes("more") || promptLower.includes("don't worry about")) {
        computeIntensity = Math.min(10, computeIntensity + 2);
      }
    }
    
    // Extract allowed and disallowed behaviors
    let allowedBehaviors = "";
    let disallowedBehaviors = "";
    
    if (promptLower.includes("brainstorm") || promptLower.includes("creative")) {
      allowedBehaviors += "Creative thinking, brainstorming, idea generation\n";
    }
    if (promptLower.includes("technical") || promptLower.includes("debug")) {
      allowedBehaviors += "Technical analysis, debugging, problem-solving\n";
    }
    if (promptLower.includes("business") || promptLower.includes("strategy")) {
      allowedBehaviors += "Business strategy, market analysis, planning\n";
    }
    
    if (promptLower.includes("no criticism") || promptLower.includes("positive")) {
      disallowedBehaviors += "Criticism, negative feedback\n";
    }
    if (promptLower.includes("no code") || promptLower.includes("avoid code")) {
      disallowedBehaviors += "Code generation, technical implementation details\n";
    }
    
    // Generate a name and description based on the prompt
    let name = "AI-Generated Configuration";
    if (promptLower.includes("brainstorm")) {
      name = "Brainstorming Session";
    } else if (promptLower.includes("debug") || promptLower.includes("technical")) {
      name = "Technical Debugging";
    } else if (promptLower.includes("business") || promptLower.includes("strategy")) {
      name = "Business Strategy";
    } else if (promptLower.includes("creative")) {
      name = "Creative Collaboration";
    }
    
    const description = `Generated from: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;
    
    // Create the configuration object
    const config = {
      name,
      description,
      isTemplate: false,
      dynamics: {
        responseOrdering,
        sessionPersistence,
        typingIndicatorDelay: 1000,
        minResponseDelay: 500,
        maxResponseDelay: 2000,
      },
      inputHandling: {
        inputConsideration,
        maxContextWindowSize: computeIntensity > 5 ? 15 : 10,
      },
      executionRules: {
        toolPermissions,
        computeIntensity,
        allowedBehaviors: allowedBehaviors || undefined,
        disallowedBehaviors: disallowedBehaviors || undefined,
      },
      companionId,
      groupChatId,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error("[CHAT_CONFIG_GENERATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 