import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PluginRegistry } from './plugin-registry.service';
import { ShofazhPlugin } from './plugin.interface';
import { PluginsController } from './plugins.controller';

export const PLUGIN_MANIFESTS = 'PLUGIN_MANIFESTS';

/**
 * بارگذار افزونه‌ها (H7.5-7). ماژول هر افزونه‌ی فعال import می‌شود (کنترلرها/سرویس‌ها/
 * شنونده‌هایش زنده می‌شوند) و هنگام بوت:
 *   ۱) مانیفست در PluginRegistry ثبت می‌شود.
 *   ۲) مجوزهای افزونه به‌صورت idempotent seed و به نقش admin متصل می‌شوند.
 *   ۳) هوک migrate افزونه (در صورت وجود) اجرا می‌شود.
 * سراسری است تا PluginRegistry در دسترس هسته و افزونه‌ها باشد.
 */
@Global()
@Module({})
export class PluginsModule implements OnApplicationBootstrap {
  private readonly logger = new Logger('Plugins');

  constructor(
    private readonly registry: PluginRegistry,
    private readonly prisma: PrismaService,
    @Inject(PLUGIN_MANIFESTS) private readonly manifests: ShofazhPlugin[],
  ) {}

  static forRoot(plugins: ShofazhPlugin[]): DynamicModule {
    return {
      module: PluginsModule,
      imports: plugins.map((p) => p.module),
      controllers: [PluginsController],
      providers: [PluginRegistry, { provide: PLUGIN_MANIFESTS, useValue: plugins }],
      exports: [PluginRegistry],
    };
  }

  async onApplicationBootstrap(): Promise<void> {
    for (const plugin of this.manifests) {
      this.registry.registerPlugin(plugin);

      // seed مجوزها + اتصال به نقش admin (idempotent، شکست‌ناپذیر)
      for (const perm of plugin.permissions ?? []) {
        try {
          const p = await this.prisma.permission.upsert({
            where: { key: perm.key },
            update: { group: perm.group, name: perm.name },
            create: perm,
          });
          const admin = await this.prisma.role.findUnique({ where: { key: 'admin' } });
          if (admin) {
            await this.prisma.rolePermission.upsert({
              where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
              update: {},
              create: { roleId: admin.id, permissionId: p.id },
            });
          }
        } catch (err) {
          this.logger.warn(`seed مجوز افزونه ${plugin.key} خطا داد: ${msg(err)}`);
        }
      }

      // هوک مهاجرت افزونه
      try {
        await plugin.migrate?.(this.prisma);
      } catch (err) {
        this.logger.warn(`migrate افزونه ${plugin.key} خطا داد: ${msg(err)}`);
      }
    }
  }
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
