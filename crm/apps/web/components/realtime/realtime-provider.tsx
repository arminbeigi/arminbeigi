'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { disconnectSocket, getSocket } from '@/lib/socket';
import type { CrmPopup } from '@/lib/types';
import { IncomingCallPopup } from './incoming-call-popup';

/**
 * اتصال Realtime: هنگام ورود کاربر به سوکت وصل می‌شود، رویداد پاپ‌آپ تماس را نمایش می‌دهد،
 * و کوئری‌های فید تماس/داشبورد را زنده باطل (invalidate) می‌کند تا بدون polling به‌روز شوند.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [popup, setPopup] = useState<CrmPopup | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const refreshFeeds = () => {
      void qc.invalidateQueries({ queryKey: ['call-feed'] });
      void qc.invalidateQueries({ queryKey: ['recent-calls'] });
      void qc.invalidateQueries({ queryKey: ['calls'] });
      void qc.invalidateQueries({ queryKey: ['total'] });
    };

    const onIncoming = (p: CrmPopup) => {
      setPopup(p);
      refreshFeeds();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => setPopup(null), 15000);
    };

    // رویدادهای تیکت پشتیبانی — به‌روزرسانی زنده‌ی فهرست/جزئیات/آمار بدون polling
    const refreshTickets = (data?: { ticketId?: string }) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      if (data?.ticketId) void qc.invalidateQueries({ queryKey: ['ticket', data.ticketId] });
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:updated', refreshFeeds);
    socket.on('ticket:created', refreshTickets);
    socket.on('ticket:updated', refreshTickets);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:updated', refreshFeeds);
      socket.off('ticket:created', refreshTickets);
      socket.off('ticket:updated', refreshTickets);
    };
  }, [user, qc]);

  useEffect(() => {
    if (!user) disconnectSocket();
  }, [user]);

  return (
    <>
      {children}
      {popup && <IncomingCallPopup popup={popup} onDismiss={() => setPopup(null)} />}
    </>
  );
}
