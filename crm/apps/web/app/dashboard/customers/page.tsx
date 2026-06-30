'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Star } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/use-debounce';
import { CUSTOMER_STATUS, CUSTOMER_STATUS_TONE, CUSTOMER_TYPE, label } from '@/lib/enums';
import { faDateTime, faNumber, toFa } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { CustomerFormModal } from '@/components/customers/customer-form';
import type { Customer, Paginated } from '@/lib/types';

export default function CustomersPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedQ = useDebounce(q);

  const query = useQuery({
    queryKey: ['customers', { q: debouncedQ, type, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      return api.get<Paginated<Customer>>(`/customers?${params.toString()}`);
    },
  });

  const resetPageAnd = (fn: () => void) => () => {
    setPage(1);
    fn();
  };

  return (
    <div className="space-y-4">
      {/* نوار ابزار */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="input pr-9"
            placeholder="جست‌وجوی نام یا شرکت…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        {hasPermission('customers:write') && (
          <button className="btn-accent" onClick={() => setShowForm(true)}>
            <Plus size={18} /> افزودن مشتری
          </button>
        )}
      </div>

      {/* فیلترها */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={!type} onClick={resetPageAnd(() => setType(''))}>
          همه انواع
        </FilterChip>
        {Object.entries(CUSTOMER_TYPE).map(([k, fa]) => (
          <FilterChip key={k} active={type === k} onClick={resetPageAnd(() => setType(k))}>
            {fa}
          </FilterChip>
        ))}
        <span className="mx-1 w-px bg-steel-200" />
        <FilterChip active={!status} onClick={resetPageAnd(() => setStatus(''))}>
          همه وضعیت‌ها
        </FilterChip>
        {Object.entries(CUSTOMER_STATUS).map(([k, fa]) => (
          <FilterChip key={k} active={status === k} onClick={resetPageAnd(() => setStatus(k))}>
            {fa}
          </FilterChip>
        ))}
      </div>

      {/* جدول */}
      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت مشتریان" />}
        {query.data && query.data.data.length === 0 && (
          <EmptyState title="مشتری‌ای یافت نشد" hint="عبارت جست‌وجو یا فیلترها را تغییر دهید" />
        )}
        {query.data && query.data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 text-steel-500">
                <th className="px-4 py-3 text-right font-medium">نام</th>
                <th className="px-4 py-3 text-right font-medium">نوع</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium">شماره اصلی</th>
                <th className="px-4 py-3 text-right font-medium">امتیاز سرنخ</th>
                <th className="px-4 py-3 text-right font-medium">ثبت</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((c) => {
                const primary = c.phones.find((p) => p.isPrimary) ?? c.phones[0];
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/dashboard/customers/${c.id}`)}
                    className="cursor-pointer border-b border-steel-50 hover:bg-steel-50"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-steel-900">{c.displayName}</div>
                      <div className="text-xs text-steel-400">{c.code}</div>
                    </td>
                    <td className="px-4 py-3 text-steel-600">{label(CUSTOMER_TYPE, c.type)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={CUSTOMER_STATUS_TONE[c.status]}>{label(CUSTOMER_STATUS, c.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-steel-600" dir="ltr">
                      {primary ? toFa(primary.number) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-steel-600">
                        <Star size={14} className="text-amber-400" /> {faNumber(c.leadScore)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-steel-400">{faDateTime(c.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <Pagination
          page={query.data.meta.page}
          pages={query.data.meta.pages}
          total={query.data.meta.total}
          onChange={setPage}
        />
      )}

      <CustomerFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onCreated={(c) => router.push(`/dashboard/customers/${c.id}`)}
      />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'badge cursor-pointer px-3 py-1.5 transition-colors',
        active ? 'bg-steel-700 text-white' : 'bg-white text-steel-600 border border-steel-200 hover:bg-steel-50',
      )}
    >
      {children}
    </button>
  );
}
