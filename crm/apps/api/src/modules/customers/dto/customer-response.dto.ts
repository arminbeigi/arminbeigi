import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Address, Customer, CustomerContact, CustomerPhone, User } from '@prisma/client';

export class PhoneDto {
  @ApiProperty() id: string;
  @ApiProperty() number: string;
  @ApiPropertyOptional() label: string | null;
  @ApiProperty() isPrimary: boolean;
}

type CustomerWithRelations = Customer & {
  phones?: CustomerPhone[];
  contacts?: CustomerContact[];
  addresses?: Address[];
  owner?: Pick<User, 'id' | 'fullName'> | null;
};

export class CustomerResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() type: string;
  @ApiProperty() status: string;
  @ApiProperty() displayName: string;
  @ApiPropertyOptional() companyName: string | null;
  @ApiPropertyOptional() nationalId: string | null;
  @ApiPropertyOptional() economicCode: string | null;
  @ApiProperty() source: string;
  @ApiProperty() leadScore: number;
  @ApiPropertyOptional() notesText: string | null;
  @ApiPropertyOptional() ownerId: string | null;
  @ApiPropertyOptional() ownerName: string | null;
  @ApiProperty({ type: [PhoneDto] }) phones: PhoneDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(c: CustomerWithRelations): CustomerResponseDto {
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      status: c.status,
      displayName: c.displayName,
      companyName: c.companyName,
      nationalId: c.nationalId,
      economicCode: c.economicCode,
      source: c.source,
      leadScore: c.leadScore,
      notesText: c.notesText,
      ownerId: c.ownerId,
      ownerName: c.owner?.fullName ?? null,
      phones: (c.phones ?? []).map((p) => ({
        id: p.id,
        number: p.number,
        label: p.label,
        isPrimary: p.isPrimary,
      })),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
