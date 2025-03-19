#!/bin/sh

# Script to manually update Pinecone before pushing
echo "Manually updating Pinecone..."

# Use absolute paths for reliability
PROJECT_ROOT="/Users/dev/code/agentconsult"
SCRIPT_PATH="$PROJECT_ROOT/app/usergroupchatcontext/scripts/update_memory.py"

# Make the update_memory.py script executable
chmod +x "$SCRIPT_PATH"

# Get the OpenAI API key from .env.local
OPENAI_API_KEY=$(grep OPENAI_API_KEY $PROJECT_ROOT/.env.local | cut -d '=' -f2)

echo "Running update_memory.py with 'all' option to force update..."

# Activate Python environment and run the script
cd $PROJECT_ROOT
source .venv/bin/activate
OPENAI_API_KEY=$OPENAI_API_KEY python3 $SCRIPT_PATH all

# Check if the update was successful
if [ $? -eq 0 ]; then
    echo "Pinecone update completed successfully."
else
    echo "Warning: Failed to update Pinecone."
fi 