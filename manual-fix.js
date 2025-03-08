// manual-fix.js
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    // Find the user by email
    const userByEmail = await prisma.userUsage.findFirst({
      where: { email: "rfusseryiii@gmail.com" },
      select: { userId: true },
    })

    if (!userByEmail) {
      console.log("User not found with email rfusseryiii@gmail.com")
      return
    }

    console.log("Found user:", userByEmail.userId)

    // Calculate end date (30 days from now)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    // Update or create subscription
    const subscription = await prisma.userSubscription.upsert({
      where: { userId: userByEmail.userId },
      create: {
        userId: userByEmail.userId,
        stripeCustomerId: "manual_fix_customer",
        stripeSubscriptionId: "manual_fix_sub_" + Date.now(),
        stripePriceId: "price_1OqoH8HcGZrJ1mCF8dYP2H3k", // Use the standard price ID
        stripeCurrentPeriodEnd: endDate,
        price: 4.99,
      },
      update: {
        stripeSubscriptionId: "manual_fix_sub_" + Date.now(),
        stripeCurrentPeriodEnd: endDate,
      },
    })

    console.log("Updated subscription:", subscription)

    // Verify the subscription
    const verifySubscription = await prisma.userSubscription.findUnique({
      where: { userId: userByEmail.userId },
    })

    console.log("Verification:", verifySubscription)
  } catch (error) {
    console.error("Error:", error)
  }
}

// Create the directory structure if it doesn't exist
const createDirs = (dirPath) => {
  const parts = dirPath.split(path.sep);
  let currentPath = '';
  
  for (const part of parts) {
    currentPath = currentPath ? path.join(currentPath, part) : part;
    if (!fs.existsSync(currentPath)) {
      fs.mkdirSync(currentPath);
    }
  }
};

// Try to fix the missing client-reference-manifest.js issue
const fixMissingManifest = () => {
  console.log('Checking for missing client-reference-manifest.js...');
  
  const manifestPath = path.join('.next', 'server', 'app', 'page_client-reference-manifest.js');
  const manifestDir = path.dirname(manifestPath);
  
  // Create empty client-reference-manifest.js file if it doesn't exist
  if (!fs.existsSync(manifestPath)) {
    console.log(`Creating empty ${manifestPath} file...`);
    
    // Create directory structure if it doesn't exist
    createDirs(manifestDir);
    
    // Create a basic manifest file
    const content = `
self.__RSC_MANIFEST={
  "ssrModuleMapping": {},
  "edgeSSRModuleMapping": {},
  "csrModuleMapping": {},
  "clientModules": {}
};
self.__RSC_SERVER_MANIFEST={};
self.__RSC_CHUNK_GROUPS_MANIFEST={};
    `;
    
    fs.writeFileSync(manifestPath, content);
    console.log(`Created ${manifestPath}`);
  } else {
    console.log(`${manifestPath} already exists, no action needed.`);
  }
};

// Execute the fix
fixMissingManifest();

// Check for other potential issues
console.log('Checking for other potential Next.js issues...');

// Check for multiple route group conflicts
const checkRouteConflicts = () => {
  // This would require parsing the app directory structure
  console.log('Route group conflict detection not implemented in this script.');
  console.log('Ensure you don\'t have multiple page.tsx files resolving to the same route.');
};

checkRouteConflicts();

console.log('Manual fixes completed. Try running `npx next dev` again.');

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
