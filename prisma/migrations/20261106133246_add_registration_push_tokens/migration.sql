-- CreateTable
CREATE TABLE "registration_push_tokens" (
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_push_tokens_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "registration_push_tokens" ADD CONSTRAINT "registration_push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Registration"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
