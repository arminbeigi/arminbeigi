import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AssistantDto {
  @ApiProperty({ example: 'چند مشتری داریم؟' })
  @IsString()
  @MinLength(2)
  query: string;
}
