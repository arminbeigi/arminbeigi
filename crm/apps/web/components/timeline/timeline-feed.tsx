'use client';

import { useQuery } from '@tanstack/react-query';
import { Clock, User } from 'lucide-react';
import { api } from '@/lib/api';
import { faDateTime } from '@/lib/format';
import { Loading, EmptyState } from '@/components/ui/feedback';
import type { Paginated, TimelineEntry } from '@/lib/types';

// نگاشت خانواده‌ی رویداد به رنگ نقطه‌ی تایم‌لاین
const DOT_TONE: Record<string, string> = {
  ticket: 'bg-flame-500',
  call: 'bg-sky-500',
  deal: 'bg-emerald-500',
  customer: 'bg-violet-500',
  lead: 'bg-amber-500',
  maintenance: 'bg-teal-500',
  invoice: 'bg-indigo-500',
  payment: 'bg-green-600',
  warranty: 'bg-rose-500',
  asset: 'bg-cyan-600',
  workflow: 'bg-steel-500',
};

function dotTone(eventName: string): string {
  const family = eventName.split('.')[0];
  return DOT_TONE[family] ?? 'bg-steel-400';
}

/**
 * فید تایم‌لاین یک موجودیت (یا سراسری). append-only و مبتنی بر رویدادهای دامنه.
 * با هر رویداد جدید (invalidate از realtime) به‌روز می‌شود.
 */
export function TimelineFeed({
  entityType,
  entityId,
  limit = 20,
}: {
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const path =
    entityType && entityId
      ? `/timeline/entity/${entityType}/${entityId}?limit=${limit}`
      : `/timeline?limit=${limit}`;

  const query = useQuery({
    queryKey: ['timeline', entityType, entityId],
    queryFn: () => api.get<Paginated<TimelineEntry>>(path),
  });

  if (query.isLoading) return <Loading />;
  if (!query.data || query.data.data.length === 0)
    return <EmptyState title="رویدادی ثبت نشده است" />;

  return (
    <ol className="relative space-y-4 pr-4">
      {/* خط عمودی تایم‌لاین (RTL: سمت راست) */}
      <span className="absolute bottom-2 right-1.5 top-2 w-px bg-steel-100" aria-hidden />
      {query.data.data.map((e) => (
        <li key={e.id} className="relative pr-5">
          <span
            className={`absolute right-0 top-1.5 h-3 w-3 rounded-full ring-2 ring-white ${dotTone(e.eventName)}`}
            aria-hidden
          />
          <div className="text-sm font-medium text-steel-800">{e.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-steel-400">
            <span className="flex items-center gap-1">
              <Clock size={11} /> {faDateTime(e.occurredAt)}
            </span>
            {e.actorName && (
              <span className="flex items-center gap-1">
                <User size={11} /> {e.actorName}
              </span>
            )}
            <span className="font-mono text-[10px] text-steel-300">{e.eventName}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
