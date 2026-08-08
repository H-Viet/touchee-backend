/*
  Warnings:

  - You are about to drop the column `downVote` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `reply_for_comment_id` on the `comments` table. All the data in the column will be lost.
  - You are about to drop the column `upVote` on the `comments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_reply_for_comment_id_fkey";

-- AlterTable
ALTER TABLE "comments" DROP COLUMN "downVote",
DROP COLUMN "reply_for_comment_id",
DROP COLUMN "upVote",
ADD COLUMN     "depth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "down_vote" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "path" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "up_vote" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "comments_post_id_depth_idx" ON "comments"("post_id", "depth");

-- CreateIndex
CREATE INDEX "comments_path_idx" ON "comments"("path");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
