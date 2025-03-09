import { Metadata } from "next";
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import FilesClient from "./components/files-client";
import prismadb from "@/lib/prismadb";

export const metadata: Metadata = {
  title: "Files | GroupChatBotBuilder",
  description: "Upload, manage, and organize your files for AI companions",
};

const FilesPage = async () => {
  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    return redirect("/login");
  }

  // Fetch user usage for token information
  const userUsage = await prismadb.userUsage.findUnique({
    where: {
      userId,
    },
  });

  if (!userUsage) {
    return redirect("/login");
  }

  // Fetch user's files
  // Fetch only metadata for initial load (we'll fetch content in client)
  const files = await prismadb.file.findMany({
    where: {
      userId,
      status: {
        not: "DELETED"
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20, // Initial page size
  });

  // Fetch file groups
  const fileGroups = await prismadb.fileGroup.findMany({
    where: {
      userId,
    },
    orderBy: {
      name: "asc"
    },
    include: {
      files: {
        include: {
          file: true
        }
      }
    }
  });

  // Get total storage used
  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { totalStorage: true }
  });

  return (
    <div className="h-full p-4 space-y-2">
      <FilesClient 
        files={JSON.parse(JSON.stringify(files))} 
        fileGroups={JSON.parse(JSON.stringify(fileGroups))}
        userId={userId}
        availableTokens={userUsage.availableTokens}
        totalStorage={user?.totalStorage || 0}
      />
    </div>
  );
};

export default FilesPage; 