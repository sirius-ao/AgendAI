-- Extend an existing database without resetting schools or user accounts.
CREATE TYPE "DashboardCollection" AS ENUM ('SUBJECTS', 'PLANS', 'ATTENDANCE', 'ASSESSMENTS', 'EVENTS', 'RESOURCES', 'LIBRARY', 'REPORTS', 'CONVERSATIONS', 'TASKS', 'SETTINGS', 'ONBOARDING', 'CLASSES', 'STUDENTS', 'FOLDERS');

ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(40) NOT NULL DEFAULT '';

CREATE TABLE "SchoolInvitation" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SchoolInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DashboardRecord" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "collection" "DashboardCollection" NOT NULL,
    "recordId" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchoolInvitation_tokenHash_key" ON "SchoolInvitation"("tokenHash");
CREATE INDEX "SchoolInvitation_schoolId_email_acceptedAt_revokedAt_idx" ON "SchoolInvitation"("schoolId", "email", "acceptedAt", "revokedAt");
CREATE INDEX "DashboardRecord_schoolId_collection_updatedAt_idx" ON "DashboardRecord"("schoolId", "collection", "updatedAt");
CREATE UNIQUE INDEX "DashboardRecord_schoolId_collection_recordId_key" ON "DashboardRecord"("schoolId", "collection", "recordId");

ALTER TABLE "SchoolInvitation" ADD CONSTRAINT "SchoolInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolInvitation" ADD CONSTRAINT "SchoolInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DashboardRecord" ADD CONSTRAINT "DashboardRecord_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(40) NOT NULL,
    "entity" VARCHAR(60) NOT NULL,
    "recordId" VARCHAR(120),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_schoolId_createdAt_idx" ON "AuditEvent"("schoolId", "createdAt");
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
