import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AssetKind, AssetStatus, Prisma } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateAssetDto {
  @ApiProperty({ description: 'نام/توضیح کوتاه تجهیز' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: AssetKind })
  @IsEnum(AssetKind)
  kind!: AssetKind;

  @ApiProperty({ description: 'شناسه‌ی مشتری مالک' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional() @IsOptional() @IsString() serialNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() modelName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() productId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @ApiPropertyOptional({ description: 'تاریخ نصب (ISO)' })
  @IsOptional()
  @IsDateString()
  installedAt?: string;

  @ApiPropertyOptional({ description: 'پایان گارانتی (ISO)' })
  @IsOptional()
  @IsDateString()
  warrantyUntil?: string;

  @ApiPropertyOptional({ description: 'اسناد/عکس‌ها: { documents:[{name,url}], photos:[url] }' })
  @IsOptional()
  meta?: Prisma.InputJsonValue;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class QueryAssetsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AssetKind }) @IsOptional() @IsEnum(AssetKind) kind?: AssetKind;
  @ApiPropertyOptional({ enum: AssetStatus }) @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() projectId?: string;
}
