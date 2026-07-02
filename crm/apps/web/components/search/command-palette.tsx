'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, CornerDownLeft } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/use-debounce';

interface Hit {
  entityType: string;
  id: string;
  title: string;
  subtitle?: string | null;
  link: string;
  score: number;
}
interface SearchResult {
  hits: Hit[];
  groups: { entityType: string; label: string; count: number }[];
}

const TYPE_LABEL: Record<string, string> = {
  CUSTOMER: 'مشتری',
  PROJECT: 'پروژه',
  DEAL: 'معامله',
  TICKET: 'تیکت',
  PRODUCT: 'محصول',
  CALL: 'تماس',
  ASSET: 'تجهیز',
};

/**
 * جست‌وجوی سراسری (Ctrl+K). روی هر صفحه‌ی داشبورد فعال است؛ نتایج رتبه‌بندی‌شده از همه‌ی
 * موجودیت‌ها را نشان می‌دهد و با Enter به مقصد می‌رود.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounce(q, 200);

  // میان‌بر Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('shofazh:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('shofazh:open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else {
      setQ('');
      setActive(0);
    }
  }, [open]);

  const search = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => api.get<SearchResult>(`/search?q=${encodeURIComponent(debounced)}`),
    enabled: open && debounced.trim().length >= 2,
  });

  const hits = search.data?.hits ?? [];

  const go = (hit: Hit) => {
    setOpen(false);
    router.push(hit.link);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); go(hits[active]); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-steel-950/40 p-4 pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-steel-100 px-4">
          <Search size={18} className="text-steel-400" />
          <input
            ref={inputRef}
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-steel-400"
            placeholder="جست‌وجوی مشتری، تیکت، تجهیز، شماره تماس…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden shrink-0 rounded bg-steel-100 px-1.5 py-0.5 text-[10px] text-steel-500 sm:block">Ctrl K</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {debounced.trim().length < 2 && (
            <div className="p-6 text-center text-sm text-steel-400">حداقل ۲ نویسه بنویسید…</div>
          )}
          {search.isFetching && <div className="p-4 text-center text-sm text-steel-400">…</div>}
          {debounced.trim().length >= 2 && !search.isFetching && hits.length === 0 && (
            <div className="p-6 text-center text-sm text-steel-400">نتیجه‌ای یافت نشد</div>
          )}
          {hits.map((h, i) => (
            <button
              key={`${h.entityType}-${h.id}`}
              className={clsx('flex w-full items-center gap-3 px-4 py-2.5 text-right', i === active ? 'bg-flame-50' : 'hover:bg-steel-50')}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
            >
              <span className="shrink-0 rounded bg-steel-100 px-1.5 py-0.5 text-[10px] text-steel-600">
                {TYPE_LABEL[h.entityType] ?? h.entityType}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-steel-800">{h.title}</span>
                {h.subtitle && <span className="block truncate text-xs text-steel-400">{h.subtitle}</span>}
              </span>
              {i === active && <CornerDownLeft size={14} className="shrink-0 text-steel-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
