'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import { CALL_DIRECTION, CALL_STATUS, label } from '@/lib/enums';
import { CALL_STATUS_TONE, isActiveCall } from '@/lib/call-style';
import { faDateTime, faDuration, toFa } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import type { Call } from '@/lib/types';

function DirectionIcon({ direction }: { direction: string }) {
  if (direction === 'INBOUND') return <ArrowDownLeft size={16} />;
  if (direction === 'OUTBOUND') return <ArrowUpRight size={16} />;
  return <ArrowLeftRight size={16} />;
}

export function CallRow({ call }: { call: Call }) {
  const router = useRouter();
  const active = isActiveCall(call.status);
  return (
    <div
      onClick={() => router.push(`/dashboard/calls/${call.id}`)}
      className={clsx(
        'flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors',
        active ? 'bg-amber-50' : 'hover:bg-steel-50',
      )}
    >
      <span
        className={clsx(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full',
          call.direction === 'INBOUND'
            ? 'bg-emerald-100 text-emerald-700'
            : call.direction === 'OUTBOUND'
              ? 'bg-steel-100 text-steel-700'
              : 'bg-steel-100 text-steel-500',
          active && 'animate-pulse',
        )}
      >
        <DirectionIcon direction={call.direction} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {call.customerId ? (
            <Link
              href={`/dashboard/customers/${call.customerId}`}
              onClick={(e) => e.stopPropagation()}
              className="truncate font-medium text-steel-900 hover:text-steel-600"
            >
              {call.customerName ?? toFa(call.fromNumber)}
            </Link>
          ) : (
            <span className="truncate font-medium text-steel-700" dir="ltr">
              {toFa(call.fromNumber)}
            </span>
          )}
          <Badge tone={CALL_STATUS_TONE[call.status]}>{label(CALL_STATUS, call.status)}</Badge>
        </div>
        <div className="text-xs text-steel-400" dir="ltr">
          {toFa(call.fromNumber)} ← {toFa(call.toNumber)}
        </div>
      </div>

      <div className="shrink-0 text-left">
        <div className="text-xs text-steel-500">{label(CALL_DIRECTION, call.direction)}</div>
        <div className="text-xs text-steel-400">{faDuration(call.talkSeconds)}</div>
      </div>
      <div className="hidden shrink-0 text-left text-xs text-steel-400 sm:block">
        {faDateTime(call.startedAt)}
      </div>
    </div>
  );
}
