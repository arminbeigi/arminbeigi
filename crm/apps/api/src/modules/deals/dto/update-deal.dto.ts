import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateDealDto } from './create-deal.dto';

/** مرحله از /move و اقلام از مسیرهای جدا مدیریت می‌شوند */
export class UpdateDealDto extends PartialType(
  OmitType(CreateDealDto, ['items', 'customerId', 'pipelineId', 'stageId'] as const),
) {}
