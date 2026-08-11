-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "guestToken" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cart_guestToken_key" ON "Cart"("guestToken");
