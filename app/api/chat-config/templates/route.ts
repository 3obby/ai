import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { 
  CHAT_CONFIG_TEMPLATES, 
  TemplateCategoryType 
} from "@/types/chat-config";

// GET /api/chat-config/templates - Get all template configurations
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const queryParams = new URL(req.url).searchParams;
    const category = queryParams.get("category") as TemplateCategoryType | null;
    
    if (category && Object.values(TemplateCategoryType).includes(category as TemplateCategoryType)) {
      // Return templates for a specific category
      return NextResponse.json({
        [category]: CHAT_CONFIG_TEMPLATES[category as TemplateCategoryType]
      });
    }
    
    // Return all templates
    return NextResponse.json(CHAT_CONFIG_TEMPLATES);
  } catch (error) {
    console.error("[CHAT_CONFIG_TEMPLATES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 