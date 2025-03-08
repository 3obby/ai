import { auth } from "@/lib/auth-helpers";
import { NextResponse } from "next/server"
import prismadb from "@/lib/prismadb"

export async function GET(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
const user = session?.user;

    if (!user || !userId) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const companions = await prismadb.companion.findMany({
      where: {
        OR: [{ private: false }, { userId: "system" }],
      },
      select: {
        id: true,
        name: true,
        src: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(companions)
  } catch (error) {
    console.log("[COMPANIONS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
