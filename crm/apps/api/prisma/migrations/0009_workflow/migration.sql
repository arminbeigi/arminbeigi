-- H7.5-6: موتور گردش‌کار
CREATE TYPE "WorkflowRunStatus" AS ENUM ('SUCCESS','FAILED','SKIPPED');

CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerEvent" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Workflow_triggerEvent_isActive_idx" ON "Workflow"("triggerEvent", "isActive");

CREATE TABLE "WorkflowRun" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "status" "WorkflowRunStatus" NOT NULL,
    "log" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkflowRun_workflowId_idx" ON "WorkflowRun"("workflowId");
CREATE INDEX "WorkflowRun_status_idx" ON "WorkflowRun"("status");
CREATE INDEX "WorkflowRun_startedAt_idx" ON "WorkflowRun"("startedAt");
ALTER TABLE "WorkflowRun" ADD CONSTRAINT "WorkflowRun_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
