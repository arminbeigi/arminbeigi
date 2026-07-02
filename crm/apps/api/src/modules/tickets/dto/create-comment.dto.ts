import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** افزودن پاسخ/یادداشت به تیکت. */
export class CreateCommentDto {
  @ApiProperty({ description: 'متن پاسخ/یادداشت' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;

  @ApiPropertyOptional({ description: 'یادداشت داخلی (به مشتری نمایش داده نمی‌شود)', default: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
