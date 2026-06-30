'use client';

import { usePathname } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { useRequireAuth } from '@/lib/auth';
import { MENU } from '@/lib/menu';

function titleFor(pathname: string): string {
  const match = [...MENU]
    .sort((a, b) => b.href.length - a.href.length)
    .find((m) => pathname === m.href || pathname.startsWith(m.href + '/'));
  return match?.label ?? 'داشبورد';
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-steel-50">
        <LoaderCircle size={28} className="animate-spin text-steel-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={titleFor(pathname)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
