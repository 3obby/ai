## GroupChatBotBuilder.AI

GroupChatBotBuilder.AI is a specialized GPT wrapper focused on creating AI companions that emulate real or fictional personas. It lets users engage with one or more companion AIs in individual or group chats.

### Features

- **AI Companion Generation**  
  In `companions/copm.py`, the script uses OpenAI’s API to generate descriptions, instructions, and seed conversations for various personas, storing them in `companions/Generated_Companions.json`.

- **Category Management**  
  A separate `Category.json` maps category names to IDs, allowing companions to be organized and filtered by category.

- **API Endpoint**  
  In `app/api/companion/behavior/route.ts`, an API route processes user messages, interacts with GPT (e.g., model `gpt-4`), and returns a summarized or expanded response from the companion persona.

### Prerequisites

- Node.js (for running the Next.js/TypeScript portion of the application).
- Python 3 (for generating companion data).
- An OpenAI API key with sufficient quota.

### Setup & Installation

1. **Clone or Fork** the repository:
   ```bash
   git clone https://github.com/yourusername/GroupChatBotBuilder-ai.git
   ```
2. **Install Node Dependencies** (from the project root):
   ```bash
   npm install
   ```
3. **Install Python Requirements** (if any are needed for your generation scripts):
   ```bash
   pip install -r requirements.txt
   ```
4. **Set Environment Variables** including your OpenAI API key (e.g. `OPENAI_API_KEY`) or edit the relevant API key usage in scripts.

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

### Contributing

- Open issues or make pull requests for improvements, new persona ideas, or feature requests.

### License

This project is licensed under the terms specified in your license file (if provided). If none exists, please consider adding one to clarify usage rights.

Enjoy using GroupChatBotBuilder.AI for all your character-driven AI interactions!

Below is an example **Character Creation** workflow you can add to the README, showing **how data is generated and loaded** into GroupChatBotBuilder.AI. Adjust as needed for your setup:

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
   npm run dev
   ```

   Your new characters should now appear in the companion list. Selecting them in the UI or referencing them by ID will start a conversation with their unique personality.

5. **Verification**
   - In your Next.js logs or browser console, verify that Billy Brainstormer (or any new companion) is visible.
   - If you see errors, confirm your data was pushed to the DB or that your front end is correctly referencing the new companion’s ID.

That’s it! You can now create, generate, and sync new AI companions seamlessly into GroupChatBotBuilder.AI.
