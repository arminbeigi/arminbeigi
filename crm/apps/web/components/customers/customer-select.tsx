'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useDebounce } from '@/lib/use-debounce';
import type { Customer, Paginated } from '@/lib/types';

/** انتخاب مشتری با جست‌وجو (قابل‌استفاده در معامله/پروژه) */
export function CustomerSelect({
  value,
  valueName,
  onChange,
}: {
  value?: string;
  valueName?: string;
  onChange: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const debouncedQ = useDebounce(q);

  const results = useQuery({
    queryKey: ['customer-select', debouncedQ],
    queryFn: async () =>
      (await api.get<Paginated<Customer>>(`/customers?limit=8${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ''}`)).data,
    enabled: open,
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="input flex items-center justify-between text-right"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? 'text-steel-900' : 'text-steel-400'}>
          {valueName || 'انتخاب مشتری…'}
        </span>
        <Search size={16} className="text-steel-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-steel-200 bg-white shadow-lg">
          <div className="border-b border-steel-100 p-2">
            <input
              autoFocus
              className="input"
              placeholder="جست‌وجوی مشتری…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {results.isLoading && <div className="p-3 text-sm text-steel-400">در حال جست‌وجو…</div>}
            {results.data?.length === 0 && (
              <div className="p-3 text-sm text-steel-400">موردی یافت نشد</div>
            )}
            {results.data?.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-steel-50"
                onClick={() => {
                  onChange(c.id, c.displayName);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span className="text-steel-800">{c.displayName}</span>
                {value === c.id && <Check size={15} className="text-emerald-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
