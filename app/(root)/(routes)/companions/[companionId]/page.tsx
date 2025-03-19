import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import prismadb from "@/lib/prismadb";
import { CharacterFrameworkDisplay } from "@/app/components/character-framework/CharacterFrameworkDisplay";

interface CompanionIdPageProps {
  params: Promise<{
    companionId: string;
  }>;
}

const CompanionIdPage = async ({
  params
}: CompanionIdPageProps) => {
  const { companionId } = await params;
  
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    return redirect("/sign-in");
  }

  const companion = await prismadb.companion.findUnique({
    where: {
      id: companionId,
      userId,
    }
  });

  const categories = await prismadb.category.findMany();

  if (!companion) {
    return redirect("/");
  }

  return ( 
    <div className="max-w-4xl mx-auto">
      <CharacterFrameworkDisplay companion={companion} />
      <div className="p-4 bg-muted/50 rounded-lg mb-4">
        <h2 className="text-xl font-bold mb-2">Edit Companion</h2>
        {/* CompanionForm would go here - integrate with your existing form */}
      </div>
    </div>
   );
}

export default CompanionIdPage; 