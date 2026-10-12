CREATE TYPE "PlatformAdminRole" AS ENUM ('NONE', 'SUPPORT', 'SUPER_ADMIN');
CREATE TYPE "BackupIntegrityStatus" AS ENUM ('NOT_CHECKED', 'VALID', 'INVALID');

ALTER TABLE "User"
  ADD COLUMN "platformAdminRole" "PlatformAdminRole" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "adminMfaSecret" VARCHAR(255),
  ADD COLUMN "adminMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "User" SET "platformAdminRole" = 'SUPER_ADMIN' WHERE "isSuperAdmin" = true;

ALTER TABLE "AdminBackup"
  ADD COLUMN "integrityStatus" "BackupIntegrityStatus" NOT NULL DEFAULT 'NOT_CHECKED',
  ADD COLUMN "verifiedAt" TIMESTAMP(3);

CREATE INDEX "User_lastLoginAt_idx" ON "User"("lastLoginAt");
CREATE INDEX "User_platformAdminRole_idx" ON "User"("platformAdminRole");
