-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'system', 'assistant');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PROCESSING', 'READY', 'ERROR', 'DELETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "totalStorage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "tokensBurned" INTEGER NOT NULL DEFAULT 0,
    "messageDelay" INTEGER NOT NULL DEFAULT 0,
    "sendMultipleMessages" BOOLEAN NOT NULL DEFAULT true,
    "customIntroduction" TEXT,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "personalityConfig" JSONB,
    "knowledgeConfig" JSONB,
    "interactionConfig" JSONB,
    "toolConfig" JSONB,

    CONSTRAINT "Companion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMessageCount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyMessageCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "stripe_current_period_end" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL,
    "computeMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "includeBaseTokens" INTEGER NOT NULL DEFAULT 1000000,
    "lastUsageResetDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionType" TEXT DEFAULT 'standard',

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableTokens" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "totalMoneySpent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "UserUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userUsageId" TEXT NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityIdea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupChat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "GroupChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupChatMember" (
    "id" TEXT NOT NULL,
    "groupChatId" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupChatMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupChatId" TEXT NOT NULL,
    "isBot" BOOLEAN NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "GroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserBurnedTokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companionId" TEXT NOT NULL,
    "tokensBurned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBurnedTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "metadata" JSONB,
    "status" "FileStatus" NOT NULL DEFAULT 'PROCESSING',
    "tokensCost" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "color" TEXT,

    CONSTRAINT "FileGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileToGroup" (
    "fileId" TEXT NOT NULL,
    "fileGroupId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FileToGroup_pkey" PRIMARY KEY ("fileId","fileGroupId")
);

-- CreateTable
CREATE TABLE "ChatConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateCategory" TEXT,
    "dynamics" JSONB NOT NULL,
    "inputHandling" JSONB NOT NULL,
    "executionRules" JSONB NOT NULL,
    "uiConfig" JSONB,
    "companionId" TEXT,
    "groupChatId" TEXT,

    CONSTRAINT "ChatConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_updatedAt_idx" ON "User"("updatedAt");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Companion_categoryId_idx" ON "Companion"("categoryId");

-- CreateIndex
CREATE INDEX "Companion_userId_idx" ON "Companion"("userId");

-- CreateIndex
CREATE INDEX "Companion_name_idx" ON "Companion"("name");

-- CreateIndex
CREATE INDEX "Companion_createdAt_idx" ON "Companion"("createdAt");

-- CreateIndex
CREATE INDEX "Companion_updatedAt_idx" ON "Companion"("updatedAt");

-- CreateIndex
CREATE INDEX "Companion_isFree_idx" ON "Companion"("isFree");

-- CreateIndex
CREATE INDEX "Companion_private_idx" ON "Companion"("private");

-- CreateIndex
CREATE INDEX "Message_companionId_idx" ON "Message"("companionId");

-- CreateIndex
CREATE INDEX "Message_userId_idx" ON "Message"("userId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message_role_idx" ON "Message"("role");

-- CreateIndex
CREATE INDEX "DailyMessageCount_userId_date_idx" ON "DailyMessageCount"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyMessageCount_date_idx" ON "DailyMessageCount"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMessageCount_userId_date_key" ON "DailyMessageCount"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_stripe_customer_id_key" ON "UserSubscription"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_stripe_subscription_id_key" ON "UserSubscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "UserSubscription_userId_idx" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_lastUsageResetDate_idx" ON "UserSubscription"("lastUsageResetDate");

-- CreateIndex
CREATE INDEX "UserSubscription_subscriptionType_idx" ON "UserSubscription"("subscriptionType");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_userId_key" ON "UserUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserUsage_email_key" ON "UserUsage"("email");

-- CreateIndex
CREATE INDEX "UserUsage_userId_idx" ON "UserUsage"("userId");

-- CreateIndex
CREATE INDEX "UserUsage_email_idx" ON "UserUsage"("email");

-- CreateIndex
CREATE INDEX "UserUsage_createdAt_idx" ON "UserUsage"("createdAt");

-- CreateIndex
CREATE INDEX "UserUsage_updatedAt_idx" ON "UserUsage"("updatedAt");

-- CreateIndex
CREATE INDEX "Transaction_userUsageId_idx" ON "Transaction"("userUsageId");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "UsageTransaction_userId_idx" ON "UsageTransaction"("userId");

-- CreateIndex
CREATE INDEX "UsageTransaction_createdAt_idx" ON "UsageTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityIdea_userId_idx" ON "CommunityIdea"("userId");

-- CreateIndex
CREATE INDEX "CommunityIdea_createdAt_idx" ON "CommunityIdea"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityIdea_upvotes_idx" ON "CommunityIdea"("upvotes");

-- CreateIndex
CREATE INDEX "CommunityIdea_downvotes_idx" ON "CommunityIdea"("downvotes");

-- CreateIndex
CREATE INDEX "GroupChat_creatorId_idx" ON "GroupChat"("creatorId");

-- CreateIndex
CREATE INDEX "GroupChat_createdAt_idx" ON "GroupChat"("createdAt");

-- CreateIndex
CREATE INDEX "GroupChat_name_idx" ON "GroupChat"("name");

-- CreateIndex
CREATE INDEX "GroupChatMember_groupChatId_idx" ON "GroupChatMember"("groupChatId");

-- CreateIndex
CREATE INDEX "GroupChatMember_companionId_idx" ON "GroupChatMember"("companionId");

-- CreateIndex
CREATE INDEX "GroupChatMember_joinedAt_idx" ON "GroupChatMember"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupChatMember_groupChatId_companionId_key" ON "GroupChatMember"("groupChatId", "companionId");

-- CreateIndex
CREATE INDEX "GroupMessage_groupChatId_idx" ON "GroupMessage"("groupChatId");

-- CreateIndex
CREATE INDEX "GroupMessage_senderId_idx" ON "GroupMessage"("senderId");

-- CreateIndex
CREATE INDEX "GroupMessage_createdAt_idx" ON "GroupMessage"("createdAt");

-- CreateIndex
CREATE INDEX "GroupMessage_isBot_idx" ON "GroupMessage"("isBot");

-- CreateIndex
CREATE INDEX "UserPrompt_userId_idx" ON "UserPrompt"("userId");

-- CreateIndex
CREATE INDEX "UserPrompt_isActive_idx" ON "UserPrompt"("isActive");

-- CreateIndex
CREATE INDEX "UserPrompt_createdAt_idx" ON "UserPrompt"("createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "UserBurnedTokens_userId_idx" ON "UserBurnedTokens"("userId");

-- CreateIndex
CREATE INDEX "UserBurnedTokens_companionId_idx" ON "UserBurnedTokens"("companionId");

-- CreateIndex
CREATE INDEX "UserBurnedTokens_tokensBurned_idx" ON "UserBurnedTokens"("tokensBurned");

-- CreateIndex
CREATE UNIQUE INDEX "UserBurnedTokens_userId_companionId_key" ON "UserBurnedTokens"("userId", "companionId");

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "File"("userId");

-- CreateIndex
CREATE INDEX "File_createdAt_idx" ON "File"("createdAt");

-- CreateIndex
CREATE INDEX "File_type_idx" ON "File"("type");

-- CreateIndex
CREATE INDEX "File_isPublic_idx" ON "File"("isPublic");

-- CreateIndex
CREATE INDEX "File_status_idx" ON "File"("status");

-- CreateIndex
CREATE INDEX "FileGroup_userId_idx" ON "FileGroup"("userId");

-- CreateIndex
CREATE INDEX "FileGroup_createdAt_idx" ON "FileGroup"("createdAt");

-- CreateIndex
CREATE INDEX "FileToGroup_fileId_idx" ON "FileToGroup"("fileId");

-- CreateIndex
CREATE INDEX "FileToGroup_fileGroupId_idx" ON "FileToGroup"("fileGroupId");

-- CreateIndex
CREATE INDEX "FileToGroup_addedAt_idx" ON "FileToGroup"("addedAt");

-- CreateIndex
CREATE INDEX "ChatConfig_userId_idx" ON "ChatConfig"("userId");

-- CreateIndex
CREATE INDEX "ChatConfig_isTemplate_idx" ON "ChatConfig"("isTemplate");

-- CreateIndex
CREATE INDEX "ChatConfig_templateCategory_idx" ON "ChatConfig"("templateCategory");

-- CreateIndex
CREATE INDEX "ChatConfig_companionId_idx" ON "ChatConfig"("companionId");

-- CreateIndex
CREATE INDEX "ChatConfig_groupChatId_idx" ON "ChatConfig"("groupChatId");

-- AddForeignKey
ALTER TABLE "Companion" ADD CONSTRAINT "Companion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userUsageId_fkey" FOREIGN KEY ("userUsageId") REFERENCES "UserUsage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChatMember" ADD CONSTRAINT "GroupChatMember_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupChatMember" ADD CONSTRAINT "GroupChatMember_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "GroupChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMessage" ADD CONSTRAINT "GroupMessage_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "GroupChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBurnedTokens" ADD CONSTRAINT "UserBurnedTokens_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileToGroup" ADD CONSTRAINT "FileToGroup_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileToGroup" ADD CONSTRAINT "FileToGroup_fileGroupId_fkey" FOREIGN KEY ("fileGroupId") REFERENCES "FileGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConfig" ADD CONSTRAINT "ChatConfig_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConfig" ADD CONSTRAINT "ChatConfig_groupChatId_fkey" FOREIGN KEY ("groupChatId") REFERENCES "GroupChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
