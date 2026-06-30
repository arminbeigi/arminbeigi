'use client';

import { useQuery } from '@tanstack/react-query';
import { Phone, Users, FolderKanban, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { faDateTime, faDuration, faNumber } from '@/lib/format';
import { StatCard } from '@/components/stat-card';
import type { Call, Paginated } from '@/lib/types';

function useTotal(path: string) {
  return useQuery({
    queryKey: ['total', path],
    queryFn: async () => (await api.get<Paginated<unknown>>(path)).meta.total,
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const customers = useTotal('/customers?limit=1');
  const deals = useTotal('/deals?limit=1&status=OPEN');
  const projects = useTotal('/projects?limit=1');
  const calls = useTotal('/calls?limit=1');

  const recentCalls = useQuery({
    queryKey: ['recent-calls'],
    queryFn: async () => (await api.get<Paginated<Call>>('/calls?limit=6')).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-steel-900">سلام، {user?.fullName} 👋</h2>
        <p className="text-sm text-steel-500">نمای کلی سامانه</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="مشتریان" value={faNumber(customers.data ?? 0)} icon={Users} loading={customers.isLoading} />
        <StatCard label="معاملات باز" value={faNumber(deals.data ?? 0)} icon={TrendingUp} tone="green" loading={deals.isLoading} />
        <StatCard label="پروژه‌ها" value={faNumber(projects.data ?? 0)} icon={FolderKanban} loading={projects.isLoading} />
        <StatCard label="تماس‌ها" value={faNumber(calls.data ?? 0)} icon={Phone} tone="flame" loading={calls.isLoading} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-steel-100 px-5 py-4">
          <h3 className="font-bold text-steel-900">تماس‌های اخیر</h3>
          <Phone size={18} className="text-steel-400" />
        </div>
        <div className="divide-y divide-steel-50">
          {recentCalls.isLoading && <div className="p-5 text-sm text-steel-400">در حال بارگذاری…</div>}
          {recentCalls.data?.length === 0 && (
            <div className="p-8 text-center text-sm text-steel-400">هنوز تماسی ثبت نشده است</div>
          )}
          {recentCalls.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    'grid h-9 w-9 place-items-center rounded-full',
                    c.direction === 'INBOUND' ? 'bg-emerald-100 text-emerald-700' : 'bg-steel-100 text-steel-700',
                  )}
                >
                  {c.direction === 'INBOUND' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </span>
                <div>
                  <div className="text-sm font-medium text-steel-900">
                    {c.customerName ?? c.fromNumber}
                  </div>
                  <div className="text-xs text-steel-400" dir="ltr">
                    {c.fromNumber} ← {c.toNumber}
                  </div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs text-steel-500">{faDateTime(c.startedAt)}</div>
                <div className="text-xs text-steel-400">{faDuration(c.talkSeconds)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
