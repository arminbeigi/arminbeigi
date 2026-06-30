import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Customer, Deal, DealItem, DealStage, Pipeline, Product, User } from '@prisma/client';

type ItemWithProduct = DealItem & { product?: Pick<Product, 'id' | 'name' | 'sku'> | null };
type DealWithRelations = Deal & {
  items?: ItemWithProduct[];
  customer?: Pick<Customer, 'id' | 'displayName'> | null;
  owner?: Pick<User, 'id' | 'fullName'> | null;
  stage?: Pick<DealStage, 'id' | 'key' | 'name' | 'order' | 'isWon' | 'isLost'> | null;
  pipeline?: Pick<Pipeline, 'id' | 'name'> | null;
};

export class DealItemDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitIrr: string;
  @ApiProperty() discount: string;
  @ApiPropertyOptional() productId: string | null;
  @ApiPropertyOptional() productName: string | null;
}

export class DealResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() title: string;
  @ApiProperty() status: string;
  @ApiProperty() customerId: string;
  @ApiPropertyOptional() customerName: string | null;
  @ApiProperty() pipelineId: string;
  @ApiPropertyOptional() pipelineName: string | null;
  @ApiProperty() stageId: string;
  @ApiPropertyOptional() stageKey: string | null;
  @ApiPropertyOptional() stageName: string | null;
  @ApiPropertyOptional() ownerId: string | null;
  @ApiPropertyOptional() ownerName: string | null;
  @ApiPropertyOptional() projectId: string | null;
  @ApiProperty() amountIrr: string;
  @ApiProperty() score: number;
  @ApiPropertyOptional() lostReason: string | null;
  @ApiPropertyOptional() expectedAt: Date | null;
  @ApiPropertyOptional() closedAt: Date | null;
  @ApiProperty({ type: [DealItemDto] }) items: DealItemDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(d: DealWithRelations): DealResponseDto {
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      status: d.status,
      customerId: d.customerId,
      customerName: d.customer?.displayName ?? null,
      pipelineId: d.pipelineId,
      pipelineName: d.pipeline?.name ?? null,
      stageId: d.stageId,
      stageKey: d.stage?.key ?? null,
      stageName: d.stage?.name ?? null,
      ownerId: d.ownerId,
      ownerName: d.owner?.fullName ?? null,
      projectId: d.projectId,
      amountIrr: d.amountIrr.toString(),
      score: d.score,
      lostReason: d.lostReason,
      expectedAt: d.expectedAt,
      closedAt: d.closedAt,
      items: (d.items ?? []).map((it) => ({
        id: it.id,
        title: it.title,
        quantity: it.quantity,
        unitIrr: it.unitIrr.toString(),
        discount: it.discount.toString(),
        productId: it.productId,
        productName: it.product?.name ?? null,
      })),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
