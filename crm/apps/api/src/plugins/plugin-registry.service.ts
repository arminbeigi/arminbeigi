import { Injectable, Logger } from '@nestjs/common';
import { INotificationChannel } from '../modules/notifications/channels/notification-channel.interface';
import { ISearchProvider } from '../modules/search/search-provider.interface';
import { IWorkflowAction } from '../modules/workflow/actions/workflow-action.interface';
import { ShofazhPlugin } from './plugin.interface';

/**
 * رجیستری سراسری افزونه‌ها — نقاط توسعه‌ی هسته.
 * افزونه‌ها در onModuleInit خود، سرویس‌هایشان را اینجا ثبت می‌کنند؛ سرویس‌های هسته
 * (اعلان/جست‌وجو/گردش‌کار) هنگام استفاده، علاوه بر builtin ها از این رجیستری می‌خوانند.
 */
@Injectable()
export class PluginRegistry {
  private readonly logger = new Logger('Plugins');
  private readonly plugins: ShofazhPlugin[] = [];
  readonly notificationChannels: INotificationChannel[] = [];
  readonly searchProviders: ISearchProvider[] = [];
  readonly workflowActions: IWorkflowAction[] = [];

  registerPlugin(manifest: ShofazhPlugin): void {
    if (this.plugins.some((p) => p.key === manifest.key)) return; // idempotent
    this.plugins.push(manifest);
    this.logger.log(`افزونه بارگذاری شد: ${manifest.name} (${manifest.key}@${manifest.version})`);
  }

  registerNotificationChannel(channel: INotificationChannel): void {
    if (this.notificationChannels.some((c) => c.key === channel.key)) return;
    this.notificationChannels.push(channel);
  }

  registerSearchProvider(provider: ISearchProvider): void {
    if (this.searchProviders.some((p) => p.entityType === provider.entityType)) return;
    this.searchProviders.push(provider);
  }

  registerWorkflowAction(action: IWorkflowAction): void {
    if (this.workflowActions.some((a) => a.type === action.type)) return;
    this.workflowActions.push(action);
  }

  list(): Omit<ShofazhPlugin, 'module' | 'migrate'>[] {
    return this.plugins.map(({ key, name, version, description, permissions, settings }) => ({
      key,
      name,
      version,
      description,
      permissions,
      settings,
    }));
  }

  all(): ShofazhPlugin[] {
    return this.plugins;
  }
}
