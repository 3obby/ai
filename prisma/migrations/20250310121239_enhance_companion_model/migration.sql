/*
  Warnings:

  - You are about to alter the column `name` on the `Companion` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - Added the required column `description` to the `Companion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seed` to the `Companion` table without a default value. This is not possible if the table is not empty.

*/

-- Migration: Enhance Companion Model
-- This migration adds new fields for companion configuration and analytics
-- It also makes the categoryId nullable and adds global visibility features

-- DropForeignKey
ALTER TABLE "Companion" DROP CONSTRAINT "Companion_categoryId_fkey";

-- AlterTable
ALTER TABLE "Companion" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "global" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "personality" JSONB DEFAULT '{}',
ADD COLUMN     "seed" TEXT NOT NULL,
ADD COLUMN     "toolAccess" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "votes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "name" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Companion_global_idx" ON "Companion"("global");

-- AddForeignKey
ALTER TABLE "Companion" ADD CONSTRAINT "Companion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
