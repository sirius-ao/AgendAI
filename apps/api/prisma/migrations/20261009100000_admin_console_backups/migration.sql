CREATE TYPE "AdminBackupStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED');

ALTER TABLE "User"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "School"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "AdminAuditEvent" (
  "id" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "targetId" UUID,
  "action" VARCHAR(60) NOT NULL,
  "entity" VARCHAR(40) NOT NULL,
  "recordId" VARCHAR(120),
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AdminAuditEvent_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "AdminBackup" (
  "id" UUID NOT NULL,
  "requesterId" UUID NOT NULL,
  "status" "AdminBackupStatus" NOT NULL DEFAULT 'QUEUED',
  "sizeBytes" BIGINT,
  "checksum" CHAR(64),
  "error" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminBackup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminBackup_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "AdminAuditEvent"("createdAt");
CREATE INDEX "AdminAuditEvent_actorId_createdAt_idx" ON "AdminAuditEvent"("actorId", "createdAt");
CREATE INDEX "AdminAuditEvent_entity_recordId_createdAt_idx" ON "AdminAuditEvent"("entity", "recordId", "createdAt");
CREATE INDEX "AdminBackup_status_createdAt_idx" ON "AdminBackup"("status", "createdAt");
CREATE INDEX "AdminBackup_expiresAt_idx" ON "AdminBackup"("expiresAt");
