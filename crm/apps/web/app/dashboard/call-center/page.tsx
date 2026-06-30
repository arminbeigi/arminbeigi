'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhoneCall, PhoneIncoming, Wifi, WifiOff, Delete } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { normalizeForDisplay } from '@/lib/format';
import { CallRow } from '@/components/calls/call-row';
import { Loading } from '@/components/ui/feedback';
import type { Call, OriginateResult, Paginated, TelephonyStatus } from '@/lib/types';

export default function CallCenterPage() {
  const { user, hasPermission } = useAuth();
  const qc = useQueryClient();
  const [dialNumber, setDialNumber] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const status = useQuery({
    queryKey: ['telephony-status'],
    queryFn: () => api.get<TelephonyStatus>('/telephony/status'),
    refetchInterval: 8000,
  });

  // فید زنده — هر ۴ ثانیه به‌روزرسانی (در فاز ۷ با WebSocket جایگزین می‌شود)
  const feed = useQuery({
    queryKey: ['call-feed'],
    queryFn: async () => (await api.get<Paginated<Call>>('/calls?limit=12')).data,
    refetchInterval: 4000,
  });

  const refreshFeed = () => void qc.invalidateQueries({ queryKey: ['call-feed'] });

  const originate = useMutation({
    mutationFn: (toNumber: string) =>
      api.post<OriginateResult>('/telephony/originate', {
        agentExtension: user?.extension,
        toNumber,
      }),
    onSuccess: () => {
      setMsg('تماس برقرار شد');
      setDialNumber('');
      refreshFeed();
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا در برقراری تماس'),
  });

  const simulate = useMutation({
    mutationFn: (fromNumber: string) =>
      api.post<unknown>('/telephony/simulate/inbound', {
        fromNumber,
        agentExtension: user?.extension,
        answer: true,
        talkSeconds: 45,
      }),
    onSuccess: () => {
      setMsg('تماس ورودی شبیه‌سازی شد');
      setSimNumber('');
      refreshFeed();
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا در شبیه‌سازی'),
  });

  const activeCall = feed.data?.find((c) => c.status === 'RINGING' && c.direction === 'INBOUND');
  const canCall = hasPermission('calls:manage');
  const hasExtension = Boolean(user?.extension);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* ستون راست: شماره‌گیر و وضعیت */}
      <div className="space-y-5">
        {/* وضعیت خط */}
        <div className="card flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            {status.data?.connected ? (
              <Wifi size={18} className="text-emerald-600" />
            ) : (
              <WifiOff size={18} className="text-red-500" />
            )}
            <span className="text-sm font-medium text-steel-700">وضعیت خط تلفن</span>
          </div>
          <span className="text-xs text-steel-500">
            {status.data?.connected ? 'متصل' : 'قطع'} •{' '}
            {status.data?.mode === 'mock' ? 'شبیه‌ساز' : 'Issabel'}
          </span>
        </div>

        {/* شماره‌گیر (click-to-call) */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 font-bold text-steel-900">
            <PhoneCall size={18} className="text-flame-600" /> تماس خروجی
          </div>
          {!hasExtension && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              داخلی تلفن برای حساب شما تنظیم نشده است؛ تماس خروجی ممکن نیست.
            </div>
          )}
          <input
            className="input mb-3 text-center text-lg tracking-widest"
            dir="ltr"
            placeholder="شماره مقصد"
            value={dialNumber}
            onChange={(e) => setDialNumber(e.target.value.replace(/[^\d۰-۹]/g, ''))}
            onKeyDown={(e) =>
              e.key === 'Enter' && canCall && hasExtension && dialNumber && originate.mutate(dialNumber)
            }
          />
          <div className="mb-3 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
              <button
                key={k}
                type="button"
                className="rounded-lg bg-steel-50 py-3 text-lg font-medium text-steel-700 hover:bg-steel-100"
                onClick={() => setDialNumber((n) => n + k)}
              >
                {normalizeForDisplay(k)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-accent flex-1"
              disabled={!canCall || !hasExtension || !dialNumber || originate.isPending}
              onClick={() => originate.mutate(dialNumber)}
            >
              <PhoneCall size={18} /> تماس
            </button>
            <button
              className="btn-ghost"
              onClick={() => setDialNumber((n) => n.slice(0, -1))}
              aria-label="حذف"
            >
              <Delete size={18} />
            </button>
          </div>
        </div>

        {/* شبیه‌سازی تماس ورودی (فقط حالت Mock) */}
        {status.data?.mode === 'mock' && canCall && (
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-steel-700">
              <PhoneIncoming size={16} className="text-emerald-600" /> شبیه‌سازی تماس ورودی
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                dir="ltr"
                placeholder="شماره تماس‌گیرنده"
                value={simNumber}
                onChange={(e) => setSimNumber(e.target.value)}
              />
              <button
                className="btn-primary"
                disabled={!simNumber || simulate.isPending}
                onClick={() => simulate.mutate(simNumber)}
              >
                شبیه‌سازی
              </button>
            </div>
            <p className="mt-2 text-[11px] text-steel-400">
              برای آزمایش جریان تماس بدون Issabel واقعی.
            </p>
          </div>
        )}

        {msg && (
          <div className="rounded-lg bg-steel-100 px-3 py-2 text-center text-sm text-steel-700">
            {msg}
          </div>
        )}
      </div>

      {/* ستون چپ: فید زنده */}
      <div className="lg:col-span-2">
        {activeCall && (
          <div className="card mb-4 border-r-4 border-amber-400 p-5">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-700">
              <PhoneIncoming size={16} className="animate-pulse" /> تماس ورودی در حال زنگ…
            </div>
            <div className="text-xl font-bold text-steel-900">
              {activeCall.customerName ?? normalizeForDisplay(activeCall.fromNumber)}
            </div>
            <div className="text-sm text-steel-400" dir="ltr">
              {normalizeForDisplay(activeCall.fromNumber)}
            </div>
            {activeCall.customerId && (
              <a
                href={`/dashboard/customers/${activeCall.customerId}`}
                className="btn-primary mt-3 inline-flex"
              >
                مشاهده پرونده مشتری
              </a>
            )}
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
            <h3 className="font-bold text-steel-900">تماس‌های زنده</h3>
            <span className="flex items-center gap-1.5 text-xs text-steel-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> به‌روزرسانی خودکار
            </span>
          </div>
          <div className="divide-y divide-steel-50">
            {feed.isLoading && <Loading />}
            {feed.data?.length === 0 && (
              <div className="p-10 text-center text-sm text-steel-400">تماسی وجود ندارد</div>
            )}
            {feed.data?.map((c) => (
              <CallRow key={c.id} call={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
