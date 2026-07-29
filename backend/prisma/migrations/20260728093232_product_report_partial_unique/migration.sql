-- Enforce "one active report per user per product" at the database level.
-- Prisma's schema syntax can't express a partial (WHERE-conditional) unique
-- index, so it's added here by hand instead of via schema.prisma.
CREATE UNIQUE INDEX "ProductReport_reporterId_productId_active_unique"
ON "ProductReport" ("reporterId", "productId")
WHERE "status" = 'PENDING';
