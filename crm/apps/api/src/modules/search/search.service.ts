import { Inject, Injectable, Logger } from '@nestjs/common';
import { ISearchProvider, SEARCH_PROVIDERS, SearchHit } from './search-provider.interface';

export interface SearchResult {
  hits: SearchHit[];
  groups: { entityType: string; label: string; count: number }[];
}

/**
 * جست‌وجوی سراسری — همه‌ی provider‌های ثبت‌شده را به‌صورت موازی اجرا و نتایج را رتبه‌بندی و
 * ادغام می‌کند. provider‌ها از ماژول‌ها/افزونه‌ها به registry تزریق می‌شوند.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger('Search');

  constructor(@Inject(SEARCH_PROVIDERS) private readonly providers: ISearchProvider[]) {}

  async search(query: string, opts: { limit?: number; types?: string[] } = {}): Promise<SearchResult> {
    const q = (query ?? '').trim();
    if (q.length < 2) return { hits: [], groups: [] };
    const perProvider = opts.limit ?? 5;

    const active = this.providers.filter((p) => !opts.types || opts.types.includes(p.entityType));
    const results = await Promise.all(
      active.map((p) =>
        p.search(q, perProvider).catch((err) => {
          this.logger.warn(`provider ${p.entityType} خطا داد: ${err instanceof Error ? err.message : String(err)}`);
          return [] as SearchHit[];
        }),
      ),
    );

    const hits = results.flat().sort((a, b) => b.score - a.score);
    const labelByType = new Map(this.providers.map((p) => [p.entityType, p.label]));
    const counts = new Map<string, number>();
    for (const h of hits) counts.set(h.entityType, (counts.get(h.entityType) ?? 0) + 1);
    const groups = [...counts.entries()].map(([entityType, count]) => ({
      entityType,
      label: labelByType.get(entityType) ?? entityType,
      count,
    }));
    return { hits, groups };
  }

  /** انواع موجودیت‌های قابل‌جست‌وجو (برای UI/عیب‌یابی). */
  searchableTypes(): { entityType: string; label: string }[] {
    return this.providers.map((p) => ({ entityType: p.entityType, label: p.label }));
  }
}
