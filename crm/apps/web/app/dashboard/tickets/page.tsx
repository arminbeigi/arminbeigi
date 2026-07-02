'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/use-debounce';
import {
  TICKET_STATUS,
  TICKET_STATUS_TONE,
  TICKET_PRIORITY,
  TICKET_PRIORITY_TONE,
  TICKET_CATEGORY,
  label,
} from '@/lib/enums';
import { faDateTime, faNumber } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { TicketFormModal } from '@/components/tickets/ticket-form';
import type { Paginated, Ticket, TicketStats } from '@/lib/types';

function Chip({
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
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-medium transition',
        active ? 'bg-flame-600 text-white' : 'bg-steel-50 text-steel-600 hover:bg-steel-100',
      )}
    >
      {children}
    </button>
  );
}

export default function TicketsPage() {
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const debouncedQ = useDebounce(q);

  const stats = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => api.get<TicketStats>('/tickets/stats'),
    refetchInterval: 30000,
  });

  const query = useQuery({
    queryKey: ['tickets', { q: debouncedQ, status, category, mine, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (mine) params.set('mine', 'true');
      return api.get<Paginated<Ticket>>(`/tickets?${params.toString()}`);
    },
  });

  const openCount =
    (stats.data?.byStatus.OPEN ?? 0) +
    (stats.data?.byStatus.IN_PROGRESS ?? 0) +
    (stats.data?.byStatus.WAITING ?? 0);

  return (
    <div className="space-y-4">
      {/* آمار خلاصه */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card p-4">
          <div className="text-xs text-steel-500">باز/در جریان</div>
          <div className="mt-1 text-2xl font-bold text-steel-900">{faNumber(openCount)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-steel-500">حل‌شده</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {faNumber(stats.data?.byStatus.RESOLVED ?? 0)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-steel-500">بسته‌شده</div>
          <div className="mt-1 text-2xl font-bold text-steel-600">
            {faNumber(stats.data?.byStatus.CLOSED ?? 0)}
          </div>
        </div>
        <div className={clsx('card p-4', (stats.data?.overdue ?? 0) > 0 && 'ring-1 ring-red-200')}>
          <div className="flex items-center gap-1 text-xs text-steel-500">
            <AlertTriangle size={13} className="text-red-500" /> گذشته از SLA
          </div>
          <div className="mt-1 text-2xl font-bold text-red-600">{faNumber(stats.data?.overdue ?? 0)}</div>
        </div>
      </div>

      {/* نوار ابزار */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="input pr-9"
            placeholder="جست‌وجوی موضوع یا کد تیکت…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-steel-600">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setPage(1);
              setMine(e.target.checked);
            }}
          />
          فقط تیکت‌های من
        </label>
        {hasPermission('tickets:write') && (
          <button className="btn-accent" onClick={() => setCreating(true)}>
            <Plus size={18} /> تیکت جدید
          </button>
        )}
      </div>

      {/* فیلتر وضعیت */}
      <div className="flex flex-wrap gap-2">
        <Chip active={!status} onClick={() => { setPage(1); setStatus(''); }}>همه وضعیت‌ها</Chip>
        {Object.entries(TICKET_STATUS).map(([k, fa]) => (
          <Chip key={k} active={status === k} onClick={() => { setPage(1); setStatus(k); }}>
            {fa}
          </Chip>
        ))}
      </div>

      {/* فیلتر دسته */}
      <div className="flex flex-wrap gap-2">
        <Chip active={!category} onClick={() => { setPage(1); setCategory(''); }}>همه دسته‌ها</Chip>
        {Object.entries(TICKET_CATEGORY).map(([k, fa]) => (
          <Chip key={k} active={category === k} onClick={() => { setPage(1); setCategory(k); }}>
            {fa}
          </Chip>
        ))}
      </div>

      {/* جدول */}
      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت تیکت‌ها" />}
        {query.data?.data.length === 0 && (
          <EmptyState title="تیکتی یافت نشد" hint="فیلترها را تغییر دهید یا تیکت جدید بسازید" />
        )}
        {query.data && query.data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 text-steel-500">
                <th className="px-4 py-3 text-right font-medium">کد</th>
                <th className="px-4 py-3 text-right font-medium">موضوع</th>
                <th className="px-4 py-3 text-right font-medium">مشتری</th>
                <th className="px-4 py-3 text-right font-medium">دسته</th>
                <th className="px-4 py-3 text-right font-medium">اولویت</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium">مسئول</th>
                <th className="px-4 py-3 text-right font-medium">ایجاد</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((t) => (
                <tr key={t.id} className="border-b border-steel-50 last:border-0 hover:bg-steel-50/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tickets/${t.id}`} className="font-mono text-xs text-flame-600 hover:underline">
                      {t.code.slice(-6)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/tickets/${t.id}`} className="font-medium text-steel-800 hover:text-flame-600">
                      {t.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-steel-600">{t.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-600">{label(TICKET_CATEGORY, t.category)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TICKET_PRIORITY_TONE[t.priority]}>{label(TICKET_PRIORITY, t.priority)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={TICKET_STATUS_TONE[t.status]}>{label(TICKET_STATUS, t.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-steel-600">{t.assigneeName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-steel-400">{faDateTime(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <Pagination
          page={page}
          pages={query.data.meta.pages}
          total={query.data.meta.total}
          onChange={setPage}
        />
      )}

      {creating && <TicketFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}
