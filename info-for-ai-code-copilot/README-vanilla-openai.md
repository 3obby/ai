# Adding Vanilla OpenAI to Your Group Chat App

This guide explains how to add the "Vanilla OpenAI" option to your group chat application, allowing users to chat with a standard OpenAI assistant without character-specific instructions.

## Implementation Overview

The implementation consists of two main parts:

1. Adding a new companion entry to the database for "Vanilla OpenAI"
2. Modifying the API code to handle this special companion differently

## Steps to Add Vanilla OpenAI

### 1. Add an Icon for Vanilla OpenAI

First, add an icon for the Vanilla OpenAI companion:

1. Create or download an appropriate icon (e.g., the OpenAI logo or a neutral AI icon)
2. Save it as `vanilla-openai.png` in your `public` directory

### 2. Run the Database Script

Run the provided script to add the Vanilla OpenAI companion to your database:

```bash
node scripts/add-vanilla-openai.js
```

This script:

- Checks if the Vanilla OpenAI companion already exists
- Gets the first category from your database (usually "General")
- Creates a new companion entry with the name "Vanilla OpenAI"
- Sets it as free for all users

### 3. Code Changes (Already Implemented)

The following code changes have already been implemented:

1. Special handling in the `shouldBotRespond` function to always make Vanilla OpenAI respond with text
2. Modified system prompts for Vanilla OpenAI to use a standard helpful assistant prompt instead of character-specific instructions

## How It Works

When a user selects Vanilla OpenAI in a group chat:

1. The bot will always respond with text (not emojis)
2. It will use the standard OpenAI assistant prompt: "You are an AI assistant having a conversation in a group chat. Be helpful, concise, and friendly."
3. It won't have any character-specific instructions or personality traits

## Troubleshooting

If you encounter issues:

1. Make sure the icon file exists at `/public/vanilla-openai.png`
2. Check that the database script ran successfully
3. Verify that the API code changes are correctly implemented
4. Check the server logs for any errors related to the Vanilla OpenAI companion

## Customization

You can customize the Vanilla OpenAI companion by:

1. Modifying the instructions in the database script
2. Changing the system prompt in the API code
3. Adjusting the response behavior in the `shouldBotRespond` function
