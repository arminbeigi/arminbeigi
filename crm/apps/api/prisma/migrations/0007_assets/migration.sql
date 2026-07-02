-- H7.5-8: بنیان دارایی (تجهیزات HVAC)
CREATE TYPE "AssetKind" AS ENUM ('WALL_BOILER','CAST_IRON_BOILER','STEEL_BOILER','BURNER','PUMP','EXPANSION_TANK','COIL_TANK','RADIATOR','HEAT_EXCHANGER','OTHER');
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE','INACTIVE','UNDER_REPAIR','DECOMMISSIONED');

CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "serialNumber" TEXT,
    "brandName" TEXT,
    "modelName" TEXT,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "productId" TEXT,
    "installedAt" TIMESTAMP(3),
    "warrantyUntil" TIMESTAMP(3),
    "location" TEXT,
    "notes" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Asset_code_key" ON "Asset"("code");
CREATE INDEX "Asset_customerId_idx" ON "Asset"("customerId");
CREATE INDEX "Asset_projectId_idx" ON "Asset"("projectId");
CREATE INDEX "Asset_kind_idx" ON "Asset"("kind");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
CREATE INDEX "Asset_serialNumber_idx" ON "Asset"("serialNumber");
CREATE INDEX "Asset_warrantyUntil_idx" ON "Asset"("warrantyUntil");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
