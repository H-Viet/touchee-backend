-- CreateEnum
CREATE TYPE "CommunityType" AS ENUM ('PUBLIC', 'RESTRICTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "type" "CommunityType" NOT NULL DEFAULT 'PUBLIC';
