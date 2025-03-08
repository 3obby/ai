import { NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth-helpers";
import prismadb from "@/lib/prismadb";


// Force dynamic rendering for API routes
export const dynamic = "force-dynamic";

const XP_REQUIRED = 15;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
const userId = session?.userId;
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, instructions } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Check user's available tokens
    const userUsage = await prismadb.userUsage.findUnique({
      where: { userId }
    });

    if (!userUsage) {
      return new NextResponse("User usage record not found", { status: 404 });
    }

    if (userUsage.availableTokens < XP_REQUIRED) {
      return new NextResponse("Insufficient tokens available", { status: 402 });
    }

    let basePrompt = '';
    
    if (instructions) {
      basePrompt = `Create a detailed AI companion behavior description for ${name}, incorporating these key elements: "${instructions}".
      The description should:
      1. Build upon and expand the provided instructions
      2. Maintain consistency with the given characteristics
      3. Add depth to the personality while staying true to the core concept
      4. Be at least 200 characters long
      5. Be written in second person ("You are...")`;
    } else {
      basePrompt = `Create a detailed AI companion behavior description for ${
        name.toLowerCase() === name ? 'a character named' : ''
      } ${name}.
      ${name.toLowerCase() === name ? `
      The description should:
      1. Define their personality traits and background
      2. Specify how they should interact with users
      3. Include their speaking style and mannerisms
      4. Be at least 200 characters long
      5. Be written in second person ("You are...")
      ` : `
      Create a behavior description that captures the essence of the real ${name}, including:
      1. Their known personality traits and background
      2. Their characteristic way of speaking and mannerisms
      3. Their typical interaction style
      4. Be at least 200 characters long
      5. Be written in second person ("You are...")
      and if you don't know anything about ${name} make them have a personality of a humble friend
      `}`;
    }

    const prompt = `${basePrompt}

    Format it similar to this example:
    "You are ${name}, a [brief description]. You [personality traits]. You have [background details]. When interacting with humans, you [interaction style]. Your communication style is [speaking style details]..."`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert at creating AI companion personalities and emulating real people's characteristics."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 500,
    });

    // Update user's tokens and total spent
    await prismadb.userUsage.update({
      where: { userId },
      data: {
        availableTokens: userUsage.availableTokens - XP_REQUIRED,
        totalSpent: userUsage.totalSpent + XP_REQUIRED
      }
    });

    // Record the transaction
   

    return NextResponse.json({
      behavior: response.choices[0].message.content
    });

  } catch (error) {
    console.log("[BEHAVIOR_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 