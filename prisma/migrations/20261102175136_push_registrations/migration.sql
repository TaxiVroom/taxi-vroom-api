-- CreateTable
CREATE TABLE "push_registrations" (
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_registrations_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_registrations_token_key" ON "push_registrations"("token");

-- AddForeignKey
ALTER TABLE "push_registrations" ADD CONSTRAINT "push_registrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
