import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

/** تخصیص یا لغو تخصیص مسئول تیکت (assigneeId=null یعنی لغو تخصیص). */
export class AssignTicketDto {
  @ApiPropertyOptional({ description: 'شناسه‌ی مسئول؛ null برای لغو تخصیص', nullable: true })
  @ValidateIf((_o, v) => v !== null)
  @IsOptional()
  @IsString()
  assigneeId!: string | null;
}
