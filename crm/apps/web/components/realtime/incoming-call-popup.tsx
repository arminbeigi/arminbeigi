'use client';

import Link from 'next/link';
import { PhoneIncoming, UserPlus, X } from 'lucide-react';
import { toFa } from '@/lib/format';
import type { CrmPopup } from '@/lib/types';

export function IncomingCallPopup({
  popup,
  onDismiss,
}: {
  popup: CrmPopup;
  onDismiss: () => void;
}) {
  const c = popup.call;
  return (
    <div className="fixed bottom-5 left-5 z-[60] w-80 animate-[slideUp_0.2s_ease-out]">
      <div className="overflow-hidden rounded-xl border border-steel-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-emerald-600 px-4 py-2 text-white">
          <div className="flex items-center gap-2 text-sm font-medium">
            <PhoneIncoming size={16} className="animate-pulse" /> تماس ورودی
          </div>
          <button onClick={onDismiss} className="rounded p-1 hover:bg-emerald-700" aria-label="بستن">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <div className="text-lg font-bold text-steel-900">
            {c.customerName ?? toFa(c.fromNumber)}
          </div>
          <div className="text-sm text-steel-400" dir="ltr">
            {toFa(c.fromNumber)}
          </div>
          {popup.leadCreated && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">
              <UserPlus size={12} /> سرنخ جدید ساخته شد
            </div>
          )}
          {popup.matched && (
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700">
              مشتری شناخته‌شده
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {c.customerId && (
              <Link
                href={`/dashboard/customers/${c.customerId}`}
                onClick={onDismiss}
                className="btn-primary flex-1 text-sm"
              >
                مشاهده پرونده
              </Link>
            )}
            <Link
              href={`/dashboard/calls/${c.id}`}
              onClick={onDismiss}
              className="btn-ghost border border-steel-200 text-sm"
            >
              جزئیات تماس
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
