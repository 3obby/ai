const fs = require("fs")
const path = require("path")

// Function to fix specific files with duplicate lines
const fixDuplicateDeclarations = (content) => {
  // Remove duplicate auth, userId and user declarations
  const lines = content.split("\n")
  const processedLines = []
  const seenDeclarations = new Set()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Skip duplicate lines for session, userId, and user declarations
    if (
      (line.startsWith("const session = await auth()") ||
        line.startsWith("const userId = session?.userId") ||
        line.startsWith("const user = session?.user")) &&
      seenDeclarations.has(line)
    ) {
      continue
    }

    // Add to seen declarations
    if (
      line.startsWith("const session = await auth()") ||
      line.startsWith("const userId = session?.userId") ||
      line.startsWith("const user = session?.user")
    ) {
      seenDeclarations.add(line)
    }

    processedLines.push(lines[i])
  }

  return processedLines.join("\n")
}

// Patterns to replace in files
const replacements = [
  {
    // Replace clerk imports with our custom auth
    from: /import\s+\{\s*auth\s*(?:,\s*currentUser)?\s*\}\s*from\s+["']@clerk\/nextjs["'];?/g,
    to: `import { auth } from "@/lib/server-auth";`,
  },
  {
    // Replace clerk imports with currentUser
    from: /import\s+\{\s*(?:auth\s*,\s*)?currentUser\s*\}\s*from\s+["']@clerk\/nextjs["'];?/g,
    to: `import { auth } from "@/lib/server-auth";`,
  },
  {
    // Replace clerk auth usage
    from: /const\s+\{\s*userId\s*\}\s*=\s*auth\(\);?/g,
    to: `const session = await auth();\nconst userId = session?.userId;`,
  },
  {
    // Replace clerk currentUser usage
    from: /const\s+user\s*=\s*await\s+currentUser\(\);?/g,
    to: `const session = await auth();\nconst userId = session?.userId;\nconst user = session?.user;`,
  },
  {
    // Update user id references
    from: /user\.id/g,
    to: `userId`,
  },
  {
    // Add req parameter to GET functions without params
    from: /export\s+async\s+function\s+GET\s*\(\s*\)\s*\{/g,
    to: `export async function GET(req: Request) {`,
  },
  {
    // Add req parameter to POST functions without params
    from: /export\s+async\s+function\s+POST\s*\(\s*\)\s*\{/g,
    to: `export async function POST(req: Request) {`,
  },
  {
    // Add req parameter to DELETE functions without params
    from: /export\s+async\s+function\s+DELETE\s*\(\s*\)\s*\{/g,
    to: `export async function DELETE(req: Request) {`,
  },
  {
    // Add req parameter to PATCH functions without params
    from: /export\s+async\s+function\s+PATCH\s*\(\s*\)\s*\{/g,
    to: `export async function PATCH(req: Request) {`,
  },
]

// Paths to API route files with Clerk dependencies
const filesToUpdate = [
  "app/api/vote/[ideaId]/vote/route.ts",
  "app/api/vote/route.ts",
  "app/api/companion/behavior/route.ts",
  "app/api/companion/route.ts",
  "app/api/companions/route.ts",
  "app/api/group-chat/route.ts",
  "app/api/group-chat/[groupId]/route.ts",
  "app/api/group-chat/[groupId]/chat/route.ts",
  "app/api/group-chat/[groupId]/members/route.ts",
  "app/api/group-chat/[groupId]/members/[companionId]/route.ts",
  "app/api/group-chat/[groupId]/messages/latest/route.ts",
  "app/api/stripe/route.ts",
  "app/api/stripe/change-subscription/route.ts",
  "app/api/stripe/manage/route.ts",
  "app/api/stripe/one-time/route.ts",
  "app/api/stripe/subscription/route.ts",
  "app/api/user-prompts/route.ts",
  "app/api/debug-subscription/route.ts",
  "app/api/limit/route.ts",
]

let updatedFiles = 0
let skippedFiles = 0

// Process each file
filesToUpdate.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath)

  try {
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, "utf8")
      let modified = false

      // Apply each replacement
      for (const { from, to } of replacements) {
        const originalContent = content
        content = content.replace(from, to)
        if (content !== originalContent) {
          modified = true
        }
      }

      // Fix duplicate declarations
      const contentAfterFixing = fixDuplicateDeclarations(content)
      if (contentAfterFixing !== content) {
        content = contentAfterFixing
        modified = true
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, "utf8")
        console.log(`✅ Updated: ${filePath}`)
        updatedFiles++
      } else {
        console.log(`⏭️  No changes needed: ${filePath}`)
        skippedFiles++
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`)
      skippedFiles++
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error)
    skippedFiles++
  }
})

console.log(
  `\nSummary: Updated ${updatedFiles} files, skipped ${skippedFiles} files.`
)
