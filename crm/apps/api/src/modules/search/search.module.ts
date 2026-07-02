import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSearchProviders } from './builtin-providers';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SEARCH_PROVIDERS } from './search-provider.interface';

/**
 * ماژول جست‌وجوی سراسری. provider‌های داخلی از prisma ساخته می‌شوند؛ افزونه‌ها می‌توانند
 * provider خود را به آرایه‌ی SEARCH_PROVIDERS اضافه کنند (registry توسعه‌پذیر).
 */
@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    {
      provide: SEARCH_PROVIDERS,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => buildSearchProviders(prisma),
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
