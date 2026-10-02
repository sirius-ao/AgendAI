CREATE TYPE "DashboardValueKind" AS ENUM ('OBJECT', 'ARRAY', 'STRING', 'NUMBER', 'BOOLEAN', 'NULL');

CREATE TABLE "DashboardValue" (
    "id" UUID NOT NULL,
    "recordDbId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "parentPath" TEXT,
    "propertyKey" TEXT,
    "position" INTEGER,
    "kind" "DashboardValueKind" NOT NULL,
    "stringValue" TEXT,
    "numberValue" DOUBLE PRECISION,
    "booleanValue" BOOLEAN,
    CONSTRAINT "DashboardValue_pkey" PRIMARY KEY ("id")
);

WITH RECURSIVE value_tree("recordDbId", "path", "parentPath", "propertyKey", "position", "value") AS (
    SELECT "id", '[]'::jsonb, NULL::text, NULL::text, NULL::integer, "payload"::jsonb
    FROM "DashboardRecord"
    UNION ALL
    SELECT
        parent."recordDbId",
        parent."path" || to_jsonb(COALESCE(child."propertyKey", child."position"::text)),
        parent."path"::text,
        child."propertyKey",
        child."position",
        child."value"
    FROM value_tree parent
    CROSS JOIN LATERAL (
        SELECT item.key AS "propertyKey", NULL::integer AS "position", item.value AS "value"
        FROM jsonb_each(parent."value") item
        WHERE jsonb_typeof(parent."value") = 'object'
        UNION ALL
        SELECT NULL::text, (item.ordinality - 1)::integer, item.value
        FROM jsonb_array_elements(parent."value") WITH ORDINALITY item(value, ordinality)
        WHERE jsonb_typeof(parent."value") = 'array'
    ) child
)
INSERT INTO "DashboardValue" (
    "id", "recordDbId", "path", "parentPath", "propertyKey", "position", "kind", "stringValue", "numberValue", "booleanValue"
)
SELECT
    md5(tree."recordDbId"::text || ':' || tree."path"::text)::uuid,
    tree."recordDbId",
    tree."path"::text,
    tree."parentPath",
    tree."propertyKey",
    tree."position",
    CASE jsonb_typeof(tree."value")
        WHEN 'object' THEN 'OBJECT'::"DashboardValueKind"
        WHEN 'array' THEN 'ARRAY'::"DashboardValueKind"
        WHEN 'string' THEN 'STRING'::"DashboardValueKind"
        WHEN 'number' THEN 'NUMBER'::"DashboardValueKind"
        WHEN 'boolean' THEN 'BOOLEAN'::"DashboardValueKind"
        ELSE 'NULL'::"DashboardValueKind"
    END,
    CASE WHEN jsonb_typeof(tree."value") = 'string' THEN tree."value" #>> '{}' END,
    CASE WHEN jsonb_typeof(tree."value") = 'number' THEN (tree."value" #>> '{}')::double precision END,
    CASE WHEN jsonb_typeof(tree."value") = 'boolean' THEN (tree."value" #>> '{}')::boolean END
FROM value_tree tree;

CREATE UNIQUE INDEX "DashboardValue_recordDbId_path_key" ON "DashboardValue"("recordDbId", "path");
CREATE INDEX "DashboardValue_recordDbId_parentPath_position_idx" ON "DashboardValue"("recordDbId", "parentPath", "position");
CREATE INDEX "DashboardValue_propertyKey_stringValue_idx" ON "DashboardValue"("propertyKey", "stringValue");
ALTER TABLE "DashboardValue" ADD CONSTRAINT "DashboardValue_recordDbId_fkey"
    FOREIGN KEY ("recordDbId") REFERENCES "DashboardRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DashboardRecord" DROP COLUMN "payload";
