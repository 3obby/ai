import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { getUserMessageLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const limit = await getUserMessageLimit(userId);
    return NextResponse.json(limit);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
} 