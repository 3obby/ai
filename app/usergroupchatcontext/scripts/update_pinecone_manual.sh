#!/bin/sh

# Manual script to update Pinecone vector database with usergroupchatcontext files

echo "Starting manual Pinecone update..."

# Make the update_pinecone.py script executable if it isn't already
chmod +x "$(dirname "$0")/update_pinecone.py"

# Run the update script
"$(dirname "$0")/update_pinecone.py"

# Check if the script execution was successful
if [ $? -ne 0 ]; then
  echo "Error updating Pinecone. Check the output above for details."
  exit 1
fi

echo "Pinecone update complete!"
exit 0 