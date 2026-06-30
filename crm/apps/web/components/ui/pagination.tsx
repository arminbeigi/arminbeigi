'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { faNumber } from '@/lib/format';

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (pages <= 1) {
    return <div className="text-xs text-steel-400">{faNumber(total)} مورد</div>;
  }
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-steel-400">
        صفحه {faNumber(page)} از {faNumber(pages)} — {faNumber(total)} مورد
      </div>
      <div className="flex items-center gap-1">
        {/* در RTL: «قبلی» سمت راست با فلش راست */}
        <button
          className="btn-ghost p-1.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="قبلی"
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="btn-ghost p-1.5 disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          aria-label="بعدی"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}
