-- H7.5: تایم‌لاین + ارتقای اعلان + ارتقای ممیزی

-- enum اولویت اعلان
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- ممیزی سازمانی: ستون‌های جدید (افزودنی)
ALTER TABLE "ActivityLog" ADD COLUMN "oldValue" JSONB;
ALTER TABLE "ActivityLog" ADD COLUMN "newValue" JSONB;
ALTER TABLE "ActivityLog" ADD COLUMN "ip" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "reason" TEXT;
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- مرکز اعلان: ستون‌های جدید (افزودنی)
ALTER TABLE "Notification" ADD COLUMN "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "Notification" ADD COLUMN "groupKey" TEXT;
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;
ALTER TABLE "Notification" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Notification_groupKey_idx" ON "Notification"("groupKey");

-- تایم‌لاین یکپارچه
CREATE TABLE "TimelineEntry" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TimelineEntry_entityType_entityId_occurredAt_idx" ON "TimelineEntry"("entityType", "entityId", "occurredAt");
CREATE INDEX "TimelineEntry_occurredAt_idx" ON "TimelineEntry"("occurredAt");
CREATE INDEX "TimelineEntry_eventName_idx" ON "TimelineEntry"("eventName");
CREATE INDEX "TimelineEntry_actorId_idx" ON "TimelineEntry"("actorId");
