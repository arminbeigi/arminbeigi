import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateProjectItemDto } from './create-project-item.dto';

export class CreateProjectDto {
  @ApiProperty({ example: 'موتورخانه مجتمع مسکونی آرین' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ enum: ProjectType, example: ProjectType.ENGINE_ROOM })
  @IsEnum(ProjectType, { message: 'نوع پروژه نامعتبر است' })
  type: ProjectType;

  @ApiProperty({ description: 'شناسه مشتری' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.DRAFT })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'شناسه آدرس محل اجرا' })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({ description: 'شناسه مدیر/سرپرست پروژه' })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // ── فنی ─────────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'متراژ ساختمان (m²)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  buildingArea?: number;

  @ApiPropertyOptional({ description: 'تعداد طبقات' })
  @IsOptional()
  @IsInt()
  @Min(0)
  floors?: number;

  @ApiPropertyOptional({ description: 'تعداد واحد' })
  @IsOptional()
  @IsInt()
  @Min(0)
  units?: number;

  @ApiPropertyOptional({ description: 'بار حرارتی (kcal/h)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  heatLoadKcal?: number;

  @ApiPropertyOptional({ description: 'برآورد هزینه (ریال)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedIrr?: number;

  @ApiPropertyOptional({ description: 'زمان‌بندی اجرا (ISO)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ type: [CreateProjectItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateProjectItemDto)
  items?: CreateProjectItemDto[];
}
