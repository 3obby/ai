import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const companions = await prisma.companion.findMany()

  console.log(`Found ${companions.length} companions:`)

  companions.forEach((comp) => {
    console.log(`- ${comp.name} (ID: ${comp.id})`)
    console.log(`  Custom Intro: ${comp.customIntroduction || "None"}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
