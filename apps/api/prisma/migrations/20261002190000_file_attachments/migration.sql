CREATE TABLE "FileAttachment" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "collection" "DashboardCollection" NOT NULL,
    "recordId" VARCHAR(120) NOT NULL,
    "objectKey" VARCHAR(500) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(120) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedAt" TIMESTAMP(3),
    CONSTRAINT "FileAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FileAttachment_objectKey_key" ON "FileAttachment"("objectKey");
CREATE INDEX "FileAttachment_schoolId_collection_recordId_createdAt_idx" ON "FileAttachment"("schoolId", "collection", "recordId", "createdAt");
CREATE INDEX "FileAttachment_userId_schoolId_idx" ON "FileAttachment"("userId", "schoolId");
ALTER TABLE "FileAttachment" ADD CONSTRAINT "FileAttachment_schoolId_collection_recordId_fkey"
    FOREIGN KEY ("schoolId", "collection", "recordId") REFERENCES "DashboardRecord"("schoolId", "collection", "recordId") ON DELETE CASCADE ON UPDATE CASCADE;
