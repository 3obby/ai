import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Get all companions
  const bots = await prisma.companion.findMany()

  console.log(`Found ${bots.length} bots`)

  // Update each bot with a custom introduction
  for (const bot of bots) {
    const intro = `Hey there! I'm ${bot.name}, and I'm excited to chat with you all! 👋`

    await prisma.companion.update({
      where: { id: bot.id },
      data: { customIntroduction: intro },
    })

    console.log(`Updated ${bot.name} with introduction: "${intro}"`)
  }

  console.log("Done!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
