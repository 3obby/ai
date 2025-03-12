-- Migration: Add Performance Indexes
-- This migration adds performance indexes for faster chat queries
-- It's safe to run on production as it only adds indexes (non-destructive)

-- Message table indexes for faster chat retrieval
CREATE INDEX IF NOT EXISTS "Message_companionId_createdAt_idx" ON "Message"("companionId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_companionId_userId_createdAt_idx" ON "Message"("companionId", "userId", "createdAt");

-- GroupChat index for faster creator + creation time queries
CREATE INDEX IF NOT EXISTS "GroupChat_creatorId_createdAt_idx" ON "GroupChat"("creatorId", "createdAt");

-- GroupMessage indexes for faster group message retrieval
CREATE INDEX IF NOT EXISTS "GroupMessage_groupChatId_createdAt_idx" ON "GroupMessage"("groupChatId", "createdAt");
CREATE INDEX IF NOT EXISTS "GroupMessage_groupChatId_senderId_idx" ON "GroupMessage"("groupChatId", "senderId");
CREATE INDEX IF NOT EXISTS "GroupMessage_groupChatId_isBot_idx" ON "GroupMessage"("groupChatId", "isBot");
CREATE INDEX IF NOT EXISTS "GroupMessage_groupChatId_senderId_createdAt_idx" ON "GroupMessage"("groupChatId", "senderId", "createdAt");

-- Note: Some indexes may already exist due to schema drift
-- These statements use IF NOT EXISTS to ensure they're safely applied 