import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ProjectType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryProjectsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProjectType })
  @IsOptional()
  @IsEnum(ProjectType)
  type?: ProjectType;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس مشتری' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'فیلتر بر اساس مدیر پروژه' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
