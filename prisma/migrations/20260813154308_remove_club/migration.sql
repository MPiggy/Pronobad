-- DropForeignKey
ALTER TABLE "ClubAdmin" DROP CONSTRAINT "ClubAdmin_clubId_fkey";

-- DropForeignKey
ALTER TABLE "ClubAdmin" DROP CONSTRAINT "ClubAdmin_userId_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_clubId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_clubId_fkey";

-- DropIndex
DROP INDEX "Team_clubId_idx";

-- DropIndex
DROP INDEX "Team_clubId_seasonId_name_key";

-- DropIndex
DROP INDEX "User_clubId_idx";

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "clubId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clubId";

-- DropTable
DROP TABLE "Club";

-- DropTable
DROP TABLE "ClubAdmin";

-- CreateIndex
CREATE UNIQUE INDEX "Team_seasonId_name_key" ON "Team"("seasonId", "name");
