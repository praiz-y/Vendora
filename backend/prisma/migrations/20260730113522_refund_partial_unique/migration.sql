-- Enforce "one active (REQUESTED) refund request per SellerOrder" at the
-- database level, mirroring the ProductReport partial-unique pattern from
-- Phase 1 (Prisma's schema syntax can't express a partial WHERE-conditional
-- unique index, so it's added here by hand instead of via schema.prisma).
-- A SellerOrder can still accumulate multiple terminal (REJECTED) refund
-- rows over time, or one REQUESTED followed later by one PROCESSED — this
-- only blocks a second simultaneously-pending request.
CREATE UNIQUE INDEX "Refund_sellerOrderId_active_unique"
ON "Refund" ("sellerOrderId")
WHERE "status" = 'REQUESTED';
