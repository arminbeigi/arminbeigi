-- C1: محافظت brute-force — افزودن شمارش تلاش ناموفق و قفل موقت حساب
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
