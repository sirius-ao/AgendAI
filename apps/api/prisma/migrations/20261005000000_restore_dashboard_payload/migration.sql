-- The relational value index remains available, but the API still uses the
-- JSON payload as its canonical representation. Restore it for compatibility
-- with the current services and rebuild existing records from DashboardValue.
ALTER TABLE "DashboardRecord"
  ADD COLUMN "payload" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION dashboard_value_payload(record_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  item record;
  segments text[];
  item_value jsonb;
BEGIN
  SELECT CASE kind
    WHEN 'ARRAY' THEN '[]'::jsonb
    ELSE '{}'::jsonb
  END
  INTO result
  FROM "DashboardValue"
  WHERE "recordDbId" = record_uuid AND path = '[]'
  LIMIT 1;

  IF result IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  FOR item IN
    SELECT *
    FROM "DashboardValue"
    WHERE "recordDbId" = record_uuid AND path <> '[]'
    ORDER BY length(path) ASC, path ASC
  LOOP
    SELECT array_agg(value ORDER BY ordinality)
    INTO segments
    FROM jsonb_array_elements_text(item.path::jsonb) WITH ORDINALITY;

    item_value := CASE item.kind
      WHEN 'OBJECT' THEN '{}'::jsonb
      WHEN 'ARRAY' THEN '[]'::jsonb
      WHEN 'STRING' THEN to_jsonb(item."stringValue")
      WHEN 'NUMBER' THEN to_jsonb(item."numberValue")
      WHEN 'BOOLEAN' THEN to_jsonb(item."booleanValue")
      ELSE 'null'::jsonb
    END;

    result := jsonb_set(result, segments, item_value, true);
  END LOOP;

  RETURN result;
END;
$$;

UPDATE "DashboardRecord" AS record
SET "payload" = dashboard_value_payload(record.id)
WHERE EXISTS (
  SELECT 1 FROM "DashboardValue" value
  WHERE value."recordDbId" = record.id
);

DROP FUNCTION dashboard_value_payload(uuid);
