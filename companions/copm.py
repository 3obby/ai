import json
from openai import OpenAI
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

# Load categories from file
with open('Category.json', 'r') as f:
    categories = json.load(f)

def get_category_id(category_name):
    for category in categories:
        if category["name"] == category_name:
            return category["id"]
    return None

def generate_companion_data(person):
    try:
        print(f"\nGenerating data for: {person['name']}")
        
        # Generate description
        print("- Generating description...")
        description_prompt = f"Write a brief 1-2 sentence description for {person['name']} focusing on their main achievements or role."
        description_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": description_prompt}]
        )
        description = description_response.choices[0].message.content.strip()
        print("✓ Description generated")

        # Generate instructions
        print("- Generating instructions...")
        instructions_prompt = f"""Create instructions for an AI companion based on {person['name']} with the following format:
        Personality: (personality traits)
        Backstory: (brief backstory)
        Key Phrases: (5-6 characteristic phrases they might use)"""
        
        instructions_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": instructions_prompt}]
        )
        instructions = instructions_response.choices[0].message.content.strip()
        print("✓ Instructions generated")

        # Generate seed conversation
        print("- Generating seed conversation...")
        seed_prompt = f"Create a short example conversation between a human and {person['name']} (5-6 exchanges) that showcases their personality and knowledge. Format it as 'Human:' and 'AI {person['name']}:'"
        
        seed_response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": seed_prompt}]
        )
        seed = seed_response.choices[0].message.content.strip()
        print("✓ Seed conversation generated")

        return {
            "id": str(uuid.uuid4()),
            "userId": "user_2t4GKq06ndOFfvyFEGOYiwrTzCp",
            "userName": "Dawit",
            "src": "",
            "name": person['name'],
            "description": description,
            "instructions": instructions,
            "seed": seed,
            "private": False,
            "createdAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "updatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3],
            "categoryId": get_category_id(person['category'])
        }

    except Exception as e:
        print(f"Error generating data for {person['name']}: {str(e)}")
        return None

# Generate companions
companions = []
for person in people:
    companion_data = generate_companion_data(person)
    if companion_data:
        companions.append(companion_data)

# Save to JSON file
with open('Generated_Companions.json', 'w', encoding='utf-8') as f:
    json.dump(companions, f, indent=2, ensure_ascii=False)

print("Companion data generated and saved to Generated_Companions.json")
