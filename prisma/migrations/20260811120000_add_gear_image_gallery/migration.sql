ALTER TABLE "gear_items"
ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "gear_items"
SET "image_urls" = ARRAY["image_url"]
WHERE "image_url" IS NOT NULL;
