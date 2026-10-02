ALTER TYPE "DashboardCollection" ADD VALUE 'TEACHER_SUBJECTS';
CREATE TYPE "SubjectRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "SubjectRequest" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "resolvedById" UUID,
    "name" VARCHAR(100) NOT NULL,
    "details" VARCHAR(500) NOT NULL DEFAULT '',
    "status" "SubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    CONSTRAINT "SubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubjectRequest_schoolId_status_createdAt_idx" ON "SubjectRequest"("schoolId", "status", "createdAt");
CREATE INDEX "SubjectRequest_requesterId_schoolId_idx" ON "SubjectRequest"("requesterId", "schoolId");
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubjectRequest" ADD CONSTRAINT "SubjectRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
