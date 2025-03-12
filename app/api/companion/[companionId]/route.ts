import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

import prismadb from "@/lib/prismadb"
import { checkSubscription } from "@/lib/subscription"


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const body = await req.json()
    const session = await auth()
    const userId = session?.userId
    const user = session?.user
    
    // Get the userId from the query if passed
    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;
    const effectiveUserName = user?.name || "Anonymous User";

    const { src, name, instructions, categoryId, private: isPrivate } = body

    if (!params.companionId) {
      return new NextResponse("Companion ID required", { status: 400 })
    }

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    if (!src || !name || !instructions || !categoryId) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params.companionId,
      },
      data: {
        categoryId,
        userId: effectiveUserId,
        userName: effectiveUserName,
        src,
        name,
        instructions,
        private: isPrivate,
      },
    })

    return NextResponse.json(companion)
  } catch (error) {
    console.log("[COMPANION_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    const session = await auth()
    const userId = session?.userId
    
    // Get the userId from the query if passed
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    
    // Use query userId if provided and no session userId exists
    const effectiveUserId = userId || queryUserId;

    if (!effectiveUserId) {
      return new NextResponse("User ID is required", { status: 400 })
    }

    const companion = await prismadb.companion.delete({
      where: {
        userId: effectiveUserId,
        id: params.companionId,
      },
    })

    return NextResponse.json(companion)
  } catch (error) {
    console.log("[COMPANION_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function GET(
  req: Request,
  { params }: { params: { companionId: string } }
) {
  try {
    if (!params.companionId) {
      return new NextResponse("Companion ID required", { status: 400 });
    }

    const companion = await prismadb.companion.findFirst({
      where: {
        id: params.companionId,
      },
    });

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    return NextResponse.json(companion);
  } catch (error) {
    console.log("[COMPANION_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
