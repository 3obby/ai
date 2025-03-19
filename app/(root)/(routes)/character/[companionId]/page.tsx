import { Metadata } from "next";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";

import { CharacterFrameworkDisplay } from "@/app/components/character-framework/CharacterFrameworkDisplay";

interface CharacterPageProps {
  params: Promise<{
    companionId: string;
  }>;
}

export async function generateMetadata({ params }: CharacterPageProps): Promise<Metadata> {
  const { companionId } = await params;
  
  const companion = await prismadb.companion.findUnique({
    where: {
      id: companionId,
    }
  });

  return {
    title: companion ? `${companion.name} - Character Profile` : "Character Profile",
    description: companion ? 
      // @ts-ignore - Description field exists in our schema
      `View the detailed character profile for ${companion.name}: ${companion.description?.substring(0, 100)}...` : 
      "View detailed character profile",
  };
}

export default async function CharacterPage({ params }: CharacterPageProps) {
  const { companionId } = await params;
  
  const companion = await prismadb.companion.findUnique({
    where: {
      id: companionId,
    }
  });

  if (!companion) {
    return redirect("/");
  }

  // Get the companion description safely
  const getDescription = () => {
    try {
      // @ts-ignore - We know this field exists in our updated schema
      return companion.description || "A helpful AI companion.";
    } catch (error) {
      return "A helpful AI companion.";
    }
  };
  
  const description = getDescription();

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-start gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10">
              {companion.src && (
                <img 
                  src={companion.src}
                  alt={companion.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{companion.name}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <CharacterFrameworkDisplay companion={companion} />
        </div>
        
        <div className="mt-8 p-4 bg-card border rounded-md">
          <h2 className="text-xl font-semibold mb-2">About This Character</h2>
          <p className="text-sm text-muted-foreground">
            This is a detailed character profile that represents the companion's personality, 
            cognitive style, values, and conversation patterns. When you chat with this companion,
            they will respond according to these traits and characteristics.
          </p>
        </div>
      </div>
    </div>
  );
} 