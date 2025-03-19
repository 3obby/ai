// Script to add Vanilla OpenAI companion to the database
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function main() {
  try {
    // Check if Vanilla OpenAI already exists
    const existingCompanion = await prisma.companion.findFirst({
      where: {
        name: "Vanilla OpenAI",
      },
    })

    if (existingCompanion) {
      console.log("Vanilla OpenAI companion already exists in the database.")
      return
    }

    // Get the first category (General)
    const category = await prisma.category.findFirst()

    if (!category) {
      console.error(
        "No categories found in the database. Please create a category first."
      )
      return
    }

    // Create the Vanilla OpenAI companion
    const vanillaOpenAI = await prisma.companion.create({
      data: {
        userId: "system", // Use 'system' as the userId for system-created companions
        userName: "system",
        src: "/vanilla-openai.png", // Make sure to add this image to your public directory
        name: "Vanilla OpenAI",
        instructions: "You are a helpful, concise, and friendly AI assistant.",
        categoryId: category.id,
        isFree: true, // Make it free for all users
        messageDelay: 0,
        sendMultipleMessages: false,
        private: false,
      },
    })

    console.log("Successfully added Vanilla OpenAI companion:", vanillaOpenAI)
  } catch (error) {
    console.error("Error adding Vanilla OpenAI companion:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
