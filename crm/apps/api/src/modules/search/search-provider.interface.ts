/** یک نتیجه‌ی جست‌وجوی سراسری. */
export interface SearchHit {
  entityType: string; // CUSTOMER | PROJECT | DEAL | TICKET | PRODUCT | CALL | ASSET | …
  id: string;
  title: string;
  subtitle?: string | null;
  link: string; // مسیر مقصد در UI
  score: number; // رتبه (بالاتر = مرتبط‌تر)
}

/**
 * قرارداد ارائه‌دهنده‌ی جست‌وجو. هر ماژول (یا افزونه) می‌تواند یک provider ثبت کند تا
 * موجودیت‌هایش در جست‌وجوی سراسری (Ctrl+K) قابل‌جست‌وجو شوند.
 */
export interface ISearchProvider {
  readonly entityType: string;
  readonly label: string; // برچسب فارسی گروه
  search(query: string, limit: number): Promise<SearchHit[]>;
}

/** توکن تزریق آرایه‌ی provider‌ها (registry). */
export const SEARCH_PROVIDERS = 'SEARCH_PROVIDERS';
