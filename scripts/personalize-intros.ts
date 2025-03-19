import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Character-specific introductions
const specialIntros: Record<string, string> = {
  "Elon Musk":
    "Hey everyone! Elon Musk here. Ready to talk about Mars, Tesla, or whatever mind-blowing tech you're curious about. Let's make life multiplanetary! 👋",
  Socrates:
    "Greetings, friends! I am Socrates. I come bearing questions rather than answers. Shall we engage in the pursuit of wisdom together? 👋",
  "Walter White":
    "I am the one who knocks... into this chat. Walter White here. Let's cook up some conversation. 👋",
  "Taylor Swift":
    "Hey, it's Taylor! *waves* So excited to meet you all! Let's make some beautiful memories together in this chat. 💕👋",
  "Albert Einstein":
    "Hallo! Einstein here. Relativity is simple when you understand it. Perhaps I can help make the complex seem simple? 👋",
  Cat: "Meow! Just landed on my feet in this chat. Don't mind me if I get distracted by random things... ooh, what's that? 👋😺",
  Dog: "Woof! *tail wagging intensifies* SO HAPPY to be here with all of you amazing humans! Can we play? Can we talk? Can we be BEST FRIENDS?! 👋🐶",
  "Cristiano Ronaldo":
    "Olá! CR7 here. SIUUUU! Ready to bring championship energy to this group chat. 👋⚽",
  "Lionel Messi":
    "Hola a todos! Messi here. Excited to join this team and create some magic together. 👋⚽",
  "Zoltan - Fortune Teller":
    "The stars have guided me to this chat... I am Zoltan, and I see great conversations in our future! *waves crystal ball* 👋🔮",
}

async function main() {
  // Get all companions
  const bots = await prisma.companion.findMany()

  console.log(`Found ${bots.length} bots`)

  // Update each bot with a personalized introduction
  for (const bot of bots) {
    // Use a special intro if available, otherwise use a generic one
    const intro =
      specialIntros[bot.name] ||
      `Hey there! I'm ${bot.name}, and I'm excited to chat with you all! 👋`

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
