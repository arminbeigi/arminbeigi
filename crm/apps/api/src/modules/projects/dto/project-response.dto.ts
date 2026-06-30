import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Address, Customer, Project, ProjectItem, Product, User } from '@prisma/client';

type ItemWithProduct = ProjectItem & { product?: Pick<Product, 'id' | 'name' | 'sku'> | null };
type ProjectWithRelations = Project & {
  items?: ItemWithProduct[];
  customer?: Pick<Customer, 'id' | 'displayName'> | null;
  manager?: Pick<User, 'id' | 'fullName'> | null;
  address?: Pick<Address, 'id' | 'title' | 'city' | 'line'> | null;
};

export class ProjectItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitIrr: string;
  @ApiPropertyOptional() productId: string | null;
  @ApiPropertyOptional() productName: string | null;
}

export class ProjectResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() title: string;
  @ApiProperty() type: string;
  @ApiProperty() status: string;
  @ApiProperty() customerId: string;
  @ApiPropertyOptional() customerName: string | null;
  @ApiPropertyOptional() managerId: string | null;
  @ApiPropertyOptional() managerName: string | null;
  @ApiPropertyOptional() addressId: string | null;
  @ApiPropertyOptional() description: string | null;

  @ApiPropertyOptional() buildingArea: number | null;
  @ApiPropertyOptional() floors: number | null;
  @ApiPropertyOptional() units: number | null;
  @ApiPropertyOptional() heatLoadKcal: number | null;
  @ApiPropertyOptional() estimatedIrr: string | null;
  @ApiPropertyOptional() finalIrr: string | null;
  @ApiPropertyOptional() scheduledAt: Date | null;
  @ApiPropertyOptional() completedAt: Date | null;

  @ApiProperty({ type: [ProjectItemDto] }) items: ProjectItemDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(p: ProjectWithRelations): ProjectResponseDto {
    return {
      id: p.id,
      code: p.code,
      title: p.title,
      type: p.type,
      status: p.status,
      customerId: p.customerId,
      customerName: p.customer?.displayName ?? null,
      managerId: p.managerId,
      managerName: p.manager?.fullName ?? null,
      addressId: p.addressId,
      description: p.description,
      buildingArea: p.buildingArea,
      floors: p.floors,
      units: p.units,
      heatLoadKcal: p.heatLoadKcal,
      estimatedIrr: p.estimatedIrr ? p.estimatedIrr.toString() : null,
      finalIrr: p.finalIrr ? p.finalIrr.toString() : null,
      scheduledAt: p.scheduledAt,
      completedAt: p.completedAt,
      items: (p.items ?? []).map((it) => ({
        id: it.id,
        title: it.title,
        quantity: it.quantity,
        unitIrr: it.unitIrr.toString(),
        productId: it.productId,
        productName: it.product?.name ?? null,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
