'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/use-debounce';
import { BOILER_KIND, FUEL_TYPE, PRODUCT_CATEGORY, label } from '@/lib/enums';
import { faNumber, faToman } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { ProductFormModal } from '@/components/products/product-form';
import type { Product, Paginated } from '@/lib/types';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null | undefined>(undefined); // undefined = closed
  const debouncedQ = useDebounce(q);

  const query = useQuery({
    queryKey: ['products', { q: debouncedQ, category, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (category) params.set('category', category);
      return api.get<Paginated<Product>>(`/products?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="input pr-9"
            placeholder="جست‌وجوی نام یا کد محصول…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        {hasPermission('products:write') && (
          <button className="btn-accent" onClick={() => setEditing(null)}>
            <Plus size={18} /> افزودن محصول
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!category} onClick={() => { setPage(1); setCategory(''); }}>همه دسته‌ها</Chip>
        {Object.entries(PRODUCT_CATEGORY).map(([k, fa]) => (
          <Chip key={k} active={category === k} onClick={() => { setPage(1); setCategory(k); }}>{fa}</Chip>
        ))}
      </div>

      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت محصولات" />}
        {query.data?.data.length === 0 && (
          <EmptyState title="محصولی یافت نشد" hint="عبارت جست‌وجو یا دسته را تغییر دهید" />
        )}
        {query.data && query.data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 text-steel-500">
                <th className="px-4 py-3 text-right font-medium">محصول</th>
                <th className="px-4 py-3 text-right font-medium">دسته</th>
                <th className="px-4 py-3 text-right font-medium">برند</th>
                <th className="px-4 py-3 text-right font-medium">قیمت</th>
                <th className="px-4 py-3 text-right font-medium">موجودی</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => hasPermission('products:write') && setEditing(p)}
                  className={clsx('border-b border-steel-50', hasPermission('products:write') && 'cursor-pointer hover:bg-steel-50')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-steel-100 text-steel-500"><Box size={16} /></span>
                      <div>
                        <div className="font-medium text-steel-900">{p.name}</div>
                        <div className="text-xs text-steel-400" dir="ltr">{p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-steel-600">
                    {label(PRODUCT_CATEGORY, p.category)}
                    {p.category === 'BOILER' && p.boilerKind !== 'NONE' && (
                      <span className="text-xs text-steel-400"> • {label(BOILER_KIND, p.boilerKind)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel-600">{p.brandName ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-700">{p.priceIrr ? faToman(p.priceIrr) : '—'}</td>
                  <td className="px-4 py-3 text-steel-600">{faNumber(p.stockQty)}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <Badge tone="bg-emerald-100 text-emerald-700">فعال</Badge>
                    ) : (
                      <Badge tone="bg-steel-100 text-steel-500">غیرفعال</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <Pagination page={query.data.meta.page} pages={query.data.meta.pages} total={query.data.meta.total} onChange={setPage} />
      )}

      {editing !== undefined && (
        <ProductFormModal
          key={editing?.id ?? 'new'}
          open
          product={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
