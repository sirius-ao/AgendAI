CREATE TABLE "SharedPlanLink" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "recordId" VARCHAR(120) NOT NULL,
    "createdById" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SharedPlanLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SharedPlanLink_tokenHash_key" ON "SharedPlanLink"("tokenHash");
CREATE INDEX "SharedPlanLink_schoolId_recordId_createdById_createdAt_idx" ON "SharedPlanLink"("schoolId", "recordId", "createdById", "createdAt");
CREATE INDEX "SharedPlanLink_expiresAt_revokedAt_idx" ON "SharedPlanLink"("expiresAt", "revokedAt");
ALTER TABLE "SharedPlanLink" ADD CONSTRAINT "SharedPlanLink_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedPlanLink" ADD CONSTRAINT "SharedPlanLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
