import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { auth } from "@/lib/auth-helpers";

import prismadb from "@/lib/prismadb";
import { authOptions } from "@/lib/auth-options";

// GET /api/chat-config - Get all chat configurations for the user
export async function GET(req: Request) {
  try {
    const queryParams = new URL(req.url).searchParams;
    const templateOnly = queryParams.get("templateOnly") === "true";
    const companionId = queryParams.get("companionId");
    const groupChatId = queryParams.get("groupChatId");
    const anonymousUserId = queryParams.get("userId");
    
    // Use auth-helpers to get session
    const session = await auth();
    const userId = session?.userId;
    
    // Use either the authenticated user ID or the anonymous user ID from the query
    const effectiveUserId = userId || anonymousUserId;

    if (!effectiveUserId) {
      // Return default empty config for anonymous users
      return NextResponse.json([]);
    }

    // Use direct SQL query since we don't have the ChatConfig model in EdgeCompatPrismaClient
    const query = `
      SELECT * FROM "ChatConfig"
      WHERE ("userId" = $1 OR "isTemplate" = true)
      ${templateOnly ? `AND "isTemplate" = true` : ''}
      ${companionId ? `AND "companionId" = $2` : ''}
      ${groupChatId ? `AND "groupChatId" = ${companionId ? '$3' : '$2'}` : ''}
      ORDER BY "updatedAt" DESC
    `;

    const params = [effectiveUserId];
    if (companionId) params.push(companionId);
    if (groupChatId) params.push(groupChatId);

    // We're using the $queryRawUnsafe because our query has dynamic conditions
    const configs = await prismadb.$queryRawUnsafe(query, ...params);

    return NextResponse.json(configs);
  } catch (error) {
    console.error("[CHAT_CONFIG_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST /api/chat-config - Create a new chat configuration
export async function POST(req: Request) {
  try {
    const queryParams = new URL(req.url).searchParams;
    const anonymousUserId = queryParams.get("userId");
    
    // Use auth-helpers to get session
    const session = await auth();
    const userId = session?.userId;
    
    // Use either the authenticated user ID or the anonymous user ID from the query
    const effectiveUserId = userId || anonymousUserId;

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 });
    }

    const body = await req.json();
    
    // Basic validation
    if (!body.name || !body.dynamics || !body.inputHandling || !body.executionRules) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Insert using SQL to bypass the model issue
    const insertQuery = `
      INSERT INTO "ChatConfig" (
        "name", "description", "userId", "isTemplate", "templateCategory",
        "dynamics", "inputHandling", "executionRules", "uiConfig",
        "companionId", "groupChatId", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;

    const newConfig = await prismadb.$queryRawUnsafe(
      insertQuery,
      body.name,
      body.description || '',
      effectiveUserId,
      body.isTemplate || false,
      body.templateCategory || null,
      JSON.stringify(body.dynamics),
      JSON.stringify(body.inputHandling),
      JSON.stringify(body.executionRules),
      JSON.stringify(body.uiConfig || {}),
      body.companionId || null,
      body.groupChatId || null
    );

    // The result will be an array with the inserted row
    return NextResponse.json(Array.isArray(newConfig) ? newConfig[0] : newConfig);
  } catch (error) {
    console.error("[CHAT_CONFIG_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 