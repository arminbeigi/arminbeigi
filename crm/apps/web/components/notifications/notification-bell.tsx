'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket } from '@/lib/socket';
import { faDateTime } from '@/lib/format';
import type { Paginated } from '@/lib/types';

interface NotificationItem {
  id: string;
  type: string;
  priority: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-amber-500',
  NORMAL: 'bg-sky-500',
  LOW: 'bg-steel-300',
};

/** زنگ اعلان در نوار بالا — شمارش خوانده‌نشده + فهرست، با به‌روزرسانی زنده از سوکت. */
export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const count = useQuery({
    queryKey: ['notif-unread'],
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Paginated<NotificationItem> & { unread: number }>('/notifications?limit=10'),
    enabled: !!user && open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notif-unread'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notif-unread'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // به‌روزرسانی زنده هنگام دریافت اعلان جدید
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    const onNew = () => {
      void qc.invalidateQueries({ queryKey: ['notif-unread'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [user, qc]);

  // بستن با کلیک بیرون
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = count.data?.count ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative btn-ghost p-2"
        onClick={() => setOpen((v) => !v)}
        aria-label="اعلان‌ها"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '۹+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-steel-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-steel-100 px-4 py-2.5">
            <span className="text-sm font-bold text-steel-900">اعلان‌ها</span>
            {unread > 0 && (
              <button className="text-xs text-flame-600 hover:underline" onClick={() => readAll.mutate()}>
                خواندن همه
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-steel-50">
            {list.isLoading && <div className="p-4 text-center text-sm text-steel-400">…</div>}
            {list.data?.data.length === 0 && (
              <div className="p-6 text-center text-sm text-steel-400">اعلانی نیست</div>
            )}
            {list.data?.data.map((n) => {
              const inner = (
                <div className={clsx('flex gap-2 px-4 py-3 hover:bg-steel-50', !n.readAt && 'bg-flame-50/40')}>
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[n.priority] ?? 'bg-steel-300')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-steel-800">{n.title}</div>
                    {n.body && <div className="truncate text-xs text-steel-500">{n.body}</div>}
                    <div className="mt-0.5 text-[11px] text-steel-400">{faDateTime(n.createdAt)}</div>
                  </div>
                  {!n.readAt && (
                    <button
                      className="shrink-0 text-steel-300 hover:text-emerald-600"
                      onClick={(e) => {
                        e.preventDefault();
                        markRead.mutate(n.id);
                      }}
                      aria-label="خواندن"
                    >
                      <Check size={15} />
                    </button>
                  )}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => { markRead.mutate(n.id); setOpen(false); }}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
