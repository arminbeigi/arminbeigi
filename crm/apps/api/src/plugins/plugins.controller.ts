import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PluginRegistry } from './plugin-registry.service';

@ApiTags('افزونه‌ها')
@ApiBearerAuth()
@Controller('plugins')
export class PluginsController {
  constructor(private readonly registry: PluginRegistry) {}

  @Get()
  @Permissions('settings:manage')
  @ApiOperation({ summary: 'فهرست افزونه‌های نصب‌شده (مانیفست‌ها)' })
  list() {
    return {
      plugins: this.registry.list(),
      extensions: {
        notificationChannels: this.registry.notificationChannels.map((c) => c.key),
        searchProviders: this.registry.searchProviders.map((p) => p.entityType),
        workflowActions: this.registry.workflowActions.map((a) => a.type),
      },
    };
  }
}
