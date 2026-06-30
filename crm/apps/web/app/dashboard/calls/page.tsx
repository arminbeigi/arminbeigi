'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { CALL_DIRECTION, CALL_STATUS } from '@/lib/enums';
import { CallRow } from '@/components/calls/call-row';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import type { Call, Paginated } from '@/lib/types';

export default function CallsPage() {
  const [direction, setDirection] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['calls', { direction, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (direction) params.set('direction', direction);
      if (status) params.set('status', status);
      return api.get<Paginated<Call>>(`/calls?${params.toString()}`);
    },
  });

  const reset = (fn: () => void) => () => {
    setPage(1);
    fn();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Chip active={!direction} onClick={reset(() => setDirection(''))}>
          همه تماس‌ها
        </Chip>
        {Object.entries(CALL_DIRECTION).map(([k, fa]) => (
          <Chip key={k} active={direction === k} onClick={reset(() => setDirection(k))}>
            {fa}
          </Chip>
        ))}
        <span className="mx-1 w-px bg-steel-200" />
        <Chip active={!status} onClick={reset(() => setStatus(''))}>
          همه وضعیت‌ها
        </Chip>
        {Object.entries(CALL_STATUS).map(([k, fa]) => (
          <Chip key={k} active={status === k} onClick={reset(() => setStatus(k))}>
            {fa}
          </Chip>
        ))}
      </div>

      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت تماس‌ها" />}
        {query.data?.data.length === 0 && (
          <EmptyState title="تماسی یافت نشد" hint="فیلترها را تغییر دهید" />
        )}
        <div className="divide-y divide-steel-50">
          {query.data?.data.map((c) => <CallRow key={c.id} call={c} />)}
        </div>
      </div>

      {query.data && (
        <Pagination
          page={query.data.meta.page}
          pages={query.data.meta.pages}
          total={query.data.meta.total}
          onChange={setPage}
        />
      )}
    </div>
  );
}

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
      onClick={onClick}
      className={clsx(
        'badge cursor-pointer px-3 py-1.5 transition-colors',
        active
          ? 'bg-steel-700 text-white'
          : 'bg-white text-steel-600 border border-steel-200 hover:bg-steel-50',
      )}
    >
      {children}
    </button>
  );
}
