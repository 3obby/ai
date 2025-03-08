## GroupChatBotBuilder

GroupChatBotBuilder is a Next.js toolbox gpt wrapper

### Key Features

- **AI Companion Generation & Chat**

  - Create and customize AI companions with unique personalities
  - Engage in individual or group chats with companions
  - Companions are generated using OpenAI's API and stored in your database

- **Personalized Prompts**

  - Store and manage custom prompts via the settings menu
  - Toggle prompts on/off to customize companion behavior
  - Prompts persist across sessions using local storage

- **Subscription Tiers**

  - Starter: Basic access with limited daily messages
  - Pro: Increased message limits and companion creation
  - Ultimate: Unlimited messages and companions

- **User Experience**
  - Modern UI with dark/light mode support
  - Mobile-responsive design
  - Progress tracking and XP system

### Prerequisites

- Node.js
- OpenAI API key
- NextAuth.js for authentication with Magic Link Email
- Stripe for payments (optional)
- PostgreSQL database

### Environment Setup

Create a `.env` file with:

```bash
# Authentication (NextAuth)
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_URL_PRODUCTION=https://yourdomain.com

# Email provider (Postmark)
POSTMARK_API_KEY=your_postmark_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Database (PostgreSQL)
DATABASE_URL=your_database_connection_string

# Stripe (Optional)
STRIPE_API_KEY=your_stripe_api_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_id_for_starter
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_id_for_pro
NEXT_PUBLIC_STRIPE_ULTIMATE_PRICE_ID=price_id_for_ultimate
```

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/GroupChatBotBuilder.git
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up the database:

   ```bash
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Project Structure

```text
.
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   └── (routes)/          # Page routes
├── components/            # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── prisma/              # Database schema
└── store/               # State management
```

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### License

This project is licensed under the terms specified in the LICENSE file.

### Features

- **AI Companion Generation**  
  In `companions/copm.py`, the script uses OpenAI's API to generate descriptions, instructions, and seed conversations for various personas, storing them in `companions/Generated_Companions.json`.

- **Category Management**  
  A separate `Category.json` maps category names to IDs, allowing companions to be organized and filtered by category.

- **API Endpoint**  
  In `app/api/companion/behavior/route.ts`, an API route processes user messages, interacts with GPT (e.g., model `gpt-4`), and returns a summarized or expanded response from the companion persona.

### Generating Companions

1. Update `people` in `companions/copm.py` with your desired personas.
2. Run the script:
   ```bash
   python companions/copm.py
   ```
   This generates or updates companion data in `companions/Generated_Companions.json`.

### Running the Application

1. **Development Server**:

   ```bash
   npm run dev
   ```

   This starts a local Next.js server, including the `/api/companion/behavior` endpoint for chat functionality.

2. Check logs or console output to see responses and debug information.

### Usage

- Interact with AI companions via the Next.js API route.
- Each request can specify which companion to emulate, or multiple for group chats.

### File Structure Highlights

```text
.
├── companions/
│   ├── copm.py               # Script to generate companion data
│   ├── Generated_Companions.json
│   └── Category.json
├── app/
│   └── api/
│       └── companion/
│           └── behavior/
│               └── route.ts  # Next.js /api endpoint for companion behaviors
├── README.md
├── package.json
└── ...
```

Below is an example **Character Creation** workflow you can add to the README, showing **how data is generated and loaded** into GroupChatBotBuilder. Adjust as needed for your setup:

---

## Character Creation & Sync Process

1. **Add Your Character to `copm.py`**  
   In `companions/copm.py`, add an entry to the `people` list (e.g., `{ "name": "Billy Brainstormer", "category": "General" }`).

2. **Generate Companion Data**  
   Run:

   ```bash
   python companions/copm.py
   ```

   This calls OpenAI to build a short description, instructions, and a seed conversation. The results are saved to `companions/Generated_Companions.json`.

3. **Sync to the Database or UI**  
   By default, `copm.py` just writes to `Generated_Companions.json`. You have two main approaches to making that data appear in the UI:

   - **(Option A) Manual DB Insertion**  
     Import or parse `companions/Generated_Companions.json` and then insert the new companion record(s) into your `Companion` table via Prisma (or your chosen DB).

     ```typescript
     // Example pseudocode
     const generatedCompanions = require("../../companions/Generated_Companions.json")

     for (const companion of generatedCompanions) {
       await prismadb.companion.create({ data: companion })
     }
     ```

   - **(Option B) Use the CompanionForm / Behavior Endpoint**  
     You can also create or edit companions in the UI. For instance, the script in  
     `app/(root)/(routes)/companion/[companionId]/components/companion-form.tsx` uses an Axios POST or PATCH to `/api/companion`. That route stores data in the database, making the companion available for chat.

4. **Run/Restart Your App**

   ```bash
   npx next dev
   ```

   Your new characters should now appear in the companion list. Selecting them in the UI or referencing them by ID will start a conversation with their unique personality.

5. **Verification**
   - In your Next.js logs or browser console, verify that Billy Brainstormer (or any new companion) is visible.
   - If you see errors, confirm your data was pushed to the DB or that your front end is correctly referencing the new companion's ID.

That's it! You can now create, generate, and sync new AI companions seamlessly into GroupChatBotBuilder.

## Auto-Documentation System

This project includes an automatic version tracking and documentation system.

### Features

- **Automatic Version Updates**: The version number is automatically incremented based on commit messages
- **Updates Page**: View all project changes at `/updates`
- **Git Integration**: Uses Git history to generate documentation

### How it Works

- All Git commits are automatically documented and categorized
- The version number on the login page is automatically updated
- Categories are determined by keywords in commit messages:
  - **Major Version**: Include "major" or "breaking" in commit message
  - **Minor Version**: Include "minor" or "feature" in commit message
  - **Patch Version**: All other commits

### Setup for Developers

If you're setting up the project for the first time, run:

```bash
node scripts/setup-hooks.js
```

This sets up the necessary Git hooks to keep the documentation updated.

### Manual Version Update

To manually update the version, run:

```bash
node scripts/update-version.js
```
