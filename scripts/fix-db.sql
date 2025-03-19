-- Copy xpEarned values to tokensBurned for all companions
UPDATE "Companion" SET "tokensBurned" = "xpEarned" WHERE "tokensBurned" IS NULL; 