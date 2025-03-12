# Creating a Proper OpenAI Icon

The current implementation has used an SVG file (`vanilla-openai.svg`) as a temporary placeholder for the Vanilla OpenAI companion. However, for optimal display, you should create a proper PNG image file.

## Instructions

1. Create or download an appropriate OpenAI logo (ensure you have the rights to use it)
2. Convert it to PNG format
3. Size it appropriately (recommended size: 256x256 pixels)
4. Save it as `vanilla-openai.png` in the `public` directory

## Alternative Approach

If you don't have image editing software readily available, you can:

1. Find a suitable OpenAI logo online (ensure you have the rights to use it)
2. Use an online converter tool to convert it to PNG format
3. Download the PNG and rename it to `vanilla-openai.png`
4. Place it in the `public` directory

## Quick Solution

You can also use a simple placeholder until you have a proper icon:

```bash
# From your project root
cd public
curl -o vanilla-openai.png https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg
```

## Changing the Image Path

If you prefer to use a different image, you can update the database record:

```javascript
// Example code to update the image path
const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

async function updateImagePath() {
  await prisma.companion.updateMany({
    where: { name: "Vanilla OpenAI" },
    data: { src: "/your-new-image-path.png" },
  })
  console.log("Image path updated")
}

updateImagePath()
```
