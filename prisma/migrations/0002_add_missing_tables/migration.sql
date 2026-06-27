-- AlterTable: add isAdmin to User
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Share
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "price" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Subaccount
CREATE TABLE "Subaccount" (
    "id" TEXT NOT NULL,
    "subaccountCode" TEXT,
    "recipientCode" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankCode" TEXT,
    "bankName" TEXT,
    "mpesaPhone" TEXT,
    "mpesaName" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Payout
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'mpesa',
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "userId" TEXT NOT NULL,
    "paidByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Ad
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" INTEGER,
    "category" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add missing columns to Order
ALTER TABLE "Order" ADD COLUMN "isReleased" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "releaseToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "releasedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "shareId" TEXT;

-- AlterTable: add shareId to Photo
ALTER TABLE "Photo" ADD COLUMN "shareId" TEXT;

-- AlterTable: add earningsBalance to Subscription
ALTER TABLE "Subscription" ADD COLUMN "earningsBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: change storage columns to BigInt
ALTER TABLE "Subscription" ALTER COLUMN "storageUsed" SET DATA TYPE BIGINT;
ALTER TABLE "Subscription" ALTER COLUMN "storageLimit" SET DATA TYPE BIGINT;

-- CreateIndexes
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");
CREATE UNIQUE INDEX "Order_releaseToken_key" ON "Order"("releaseToken");
CREATE UNIQUE INDEX "Subaccount_userId_key" ON "Subaccount"("userId");

-- AddForeignKeys
ALTER TABLE "Share" ADD CONSTRAINT "Share_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "Share"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subaccount" ADD CONSTRAINT "Subaccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
