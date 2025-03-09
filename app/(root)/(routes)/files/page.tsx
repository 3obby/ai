import { Metadata } from "next";
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import FilesClient from "./components/files-client";
import prismadb from "@/lib/prismadb";

export const metadata: Metadata = {
  title: "Files | GroupChatBotBuilder",
  description: "Upload, manage, and organize your files for AI companions",
};

// 5GB storage limit per user (in bytes)
const MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024;

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

  const totalStorage = user?.totalStorage || 0;
  const storageLimit = MAX_STORAGE_PER_USER;
  const storagePercentage = Math.min(100, Math.round((totalStorage / storageLimit) * 100));

  return (
    <div className="h-full p-4 space-y-2">
      <FilesClient 
        files={JSON.parse(JSON.stringify(files))} 
        fileGroups={JSON.parse(JSON.stringify(fileGroups))}
        userId={userId}
        availableTokens={userUsage.availableTokens}
        totalStorage={totalStorage}
        storageLimit={storageLimit}
        storagePercentage={storagePercentage}
      />
    </div>
  );
};

export default FilesPage; 