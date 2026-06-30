'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { MENU } from '@/lib/menu';
import { useAuth } from '@/lib/auth';

export function Sidebar() {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const items = MENU.filter((m) => !m.permission || hasPermission(m.permission));

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-steel-900 text-steel-100">
      <div className="border-b border-steel-800 px-4 py-5">
        <Link href="/dashboard" className="block rounded-lg bg-white px-3 py-2.5">
          <Image
            src="/logo.jpeg"
            alt="شفازح — سامانه مدیریت تأسیسات"
            width={1000}
            height={324}
            priority
            className="h-auto w-full"
          />
        </Link>
        <div className="mt-2 text-center text-[11px] text-steel-400">
          سامانه مدیریت تأسیسات
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    active
                      ? 'bg-steel-700 text-white font-medium'
                      : 'text-steel-300 hover:bg-steel-800 hover:text-white',
                  )}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-3 text-[11px] text-steel-500 border-t border-steel-800">
        نسخه ۰٫۱ — shofazh.com
      </div>
    </aside>
  );
}
