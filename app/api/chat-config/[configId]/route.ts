import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";
import { chatConfigSchema } from "@/types/chat-config";

interface ConfigIdRouteParams {
  params: {
    configId: string;
  };
}

// GET - Fetch a specific chat configuration
export async function GET(
  req: NextRequest,
  { params }: ConfigIdRouteParams
) {
  try {
    const { userId } = await auth();
    const searchParams = req.nextUrl.searchParams;
    const anonymousUserId = searchParams.get("userId");
    const effectiveUserId = userId || anonymousUserId;
    
    if (!effectiveUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { configId } = params;
    
    if (!configId) {
      return new NextResponse("Config ID is required", { status: 400 });
    }
    
    // Fetch the config
    const config = await prismadb.chatConfig.findUnique({
      where: {
        id: configId,
      }
    });
    
    if (!config) {
      return new NextResponse("Config not found", { status: 404 });
    }
    
    // Check ownership or if it's a template
    if (config.userId !== effectiveUserId && !config.isTemplate) {
      return new NextResponse("Access denied", { status: 403 });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error("[CHAT_CONFIG_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Update a specific chat configuration
export async function PATCH(
  req: NextRequest,
  { params }: ConfigIdRouteParams
) {
  try {
    const { userId } = await auth();
    const searchParams = req.nextUrl.searchParams;
    const anonymousUserId = searchParams.get("userId");
    const effectiveUserId = userId || anonymousUserId;
    
    if (!effectiveUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { configId } = params;
    
    if (!configId) {
      return new NextResponse("Config ID is required", { status: 400 });
    }
    
    // Find the existing config
    const existingConfig = await prismadb.chatConfig.findUnique({
      where: {
        id: configId,
      }
    });
    
    if (!existingConfig) {
      return new NextResponse("Config not found", { status: 404 });
    }
    
    // Check ownership
    if (existingConfig.userId !== effectiveUserId) {
      return new NextResponse("Access denied", { status: 403 });
    }
    
    const body = await req.json();
    
    // Validate the request body
    const validationResult = chatConfigSchema.partial().safeParse(body);
    
    if (!validationResult.success) {
      return new NextResponse(JSON.stringify(validationResult.error), { status: 400 });
    }
    
    // Update the config
    const updatedConfig = await prismadb.chatConfig.update({
      where: {
        id: configId,
      },
      data: {
        ...validationResult.data,
      }
    });
    
    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("[CHAT_CONFIG_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Delete a specific chat configuration
export async function DELETE(
  req: NextRequest,
  { params }: ConfigIdRouteParams
) {
  try {
    const { userId } = await auth();
    const searchParams = req.nextUrl.searchParams;
    const anonymousUserId = searchParams.get("userId");
    const effectiveUserId = userId || anonymousUserId;
    
    if (!effectiveUserId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const { configId } = params;
    
    if (!configId) {
      return new NextResponse("Config ID is required", { status: 400 });
    }
    
    // Find the existing config
    const existingConfig = await prismadb.chatConfig.findUnique({
      where: {
        id: configId,
      }
    });
    
    if (!existingConfig) {
      return new NextResponse("Config not found", { status: 404 });
    }
    
    // Check ownership
    if (existingConfig.userId !== effectiveUserId) {
      return new NextResponse("Access denied", { status: 403 });
    }
    
    // Delete the config
    await prismadb.chatConfig.delete({
      where: {
        id: configId,
      }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CHAT_CONFIG_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 