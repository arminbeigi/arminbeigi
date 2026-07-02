'use client';

import { LogOut, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-steel-100 bg-white px-6">
      <h1 className="text-lg font-bold text-steel-900">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-lg bg-steel-50 px-3 py-1.5 text-sm text-steel-400">
          <Search size={16} />
          <span>جست‌وجو…</span>
        </div>

        <NotificationBell />

        <div className="flex items-center gap-2 border-r border-steel-100 pr-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-steel-700 text-sm font-bold text-white">
            {user?.fullName?.charAt(0) ?? '؟'}
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-sm font-medium text-steel-900">{user?.fullName}</div>
            <div className="text-[11px] text-steel-400">{user?.roles?.[0] ?? ''}</div>
          </div>
        </div>

        <button onClick={() => logout()} className="btn-ghost" title="خروج">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
