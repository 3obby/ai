import { Metadata } from "next";
import { auth } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ModularizedFilesClient from "./components/ModularizedFilesClient";
import prismadb from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { FileData, FileGroup, Prompt } from "./types";

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
  const dbFiles = await prismadb.file.findMany({
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
  const dbFileGroups = await prismadb.fileGroup.findMany({
    where: {
      userId,
    },
    include: {
      files: {
        include: {
          file: true,
        },
      },
    },
  });

  // Map DB files to FileData type
  const files: FileData[] = dbFiles.map(file => ({
    id: file.id,
    name: file.name,
    originalName: file.originalName,
    type: file.type,
    size: file.size,
    url: file.url || '',
    storagePath: file.storagePath || '',
    createdAt: file.createdAt.toISOString(),
    status: file.status,
    description: file.description || undefined,
    tokensCost: file.tokensCost
  }));

  // Map DB file groups to FileGroup type
  const fileGroups: FileGroup[] = dbFileGroups.map(group => ({
    id: group.id,
    name: group.name,
    description: group.description || undefined,
    color: group.color || undefined,
    files: group.files.map(fileRelation => ({
      fileId: fileRelation.fileId,
      file: {
        id: fileRelation.file.id,
        name: fileRelation.file.name,
        originalName: fileRelation.file.originalName,
        type: fileRelation.file.type,
        size: fileRelation.file.size,
        url: fileRelation.file.url || '',
        storagePath: fileRelation.file.storagePath || '',
        createdAt: fileRelation.file.createdAt.toISOString(),
        status: fileRelation.file.status,
        description: fileRelation.file.description || undefined,
        tokensCost: fileRelation.file.tokensCost
      }
    }))
  }));

  // Calculate storage used
  const totalStorage = files.reduce((acc, file) => acc + file.size, 0);
  const storagePercentage = Math.min(100, Math.floor((totalStorage / MAX_STORAGE_PER_USER) * 100));

  // Fetch user-created prompts
  const dbPrompts = await prismadb.$queryRaw`
    SELECT id, "userId", text, "isActive", "createdAt", "updatedAt"
    FROM "UserPrompt"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC
  `;
  
  // Map prompts to the Prompt type
  const userPrompts: Prompt[] = (dbPrompts as any[]).map(prompt => ({
    id: prompt.id,
    text: prompt.text,
    isActive: prompt.isActive,
    createdAt: prompt.createdAt ? new Date(prompt.createdAt).toISOString() : undefined,
    updatedAt: prompt.updatedAt ? new Date(prompt.updatedAt).toISOString() : undefined
  }));

  return (
    <div className="h-full p-4 space-y-4">
      <ModularizedFilesClient 
        files={files}
        fileGroups={fileGroups} 
        userId={userId}
        availableTokens={userUsage.availableTokens || 0}
        totalStorage={totalStorage}
        storageLimit={MAX_STORAGE_PER_USER}
        storagePercentage={storagePercentage}
        userPrompts={userPrompts}
      />
    </div>
  );
};

export default FilesPage; 