// Script to verify and update the Vanilla OpenAI companion's image path
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  try {
    // Find the Vanilla OpenAI companion
    const vanillaOpenAI = await prisma.companion.findFirst({
      where: {
        name: "Vanilla OpenAI",
      },
    })

    if (!vanillaOpenAI) {
      console.log("Vanilla OpenAI companion not found in the database.")
      return
    }

    console.log("Found Vanilla OpenAI companion:", {
      id: vanillaOpenAI.id,
      name: vanillaOpenAI.name,
      src: vanillaOpenAI.src,
    })

    // Update the image path if it's different
    if (vanillaOpenAI.src !== "/vanilla-openai.png") {
      const updated = await prisma.companion.update({
        where: {
          id: vanillaOpenAI.id,
        },
        data: {
          src: "/vanilla-openai.png",
        },
      })

      console.log("Updated Vanilla OpenAI companion image path:", updated.src)
    } else {
      console.log("Image path is already correct.")
    }
  } catch (error) {
    console.error("Error verifying Vanilla OpenAI companion:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
