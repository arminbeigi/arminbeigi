'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Search, Check } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useDebounce } from '@/lib/use-debounce';
import { TICKET_CATEGORY, TICKET_PRIORITY } from '@/lib/enums';
import { Modal } from '@/components/ui/modal';
import type { Customer, Paginated, Ticket } from '@/lib/types';

/**
 * فرم ایجاد تیکت. اگر دسته/اولویت انتخاب نشود، بک‌اند با هوش مصنوعی خودکار تشخیص می‌دهد.
 */
export function TicketFormModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custQuery, setCustQuery] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const debounced = useDebounce(custQuery);

  const customers = useQuery({
    queryKey: ['ticket-cust-search', debounced],
    queryFn: () => api.get<Paginated<Customer>>(`/customers?q=${encodeURIComponent(debounced)}&limit=6`),
    enabled: debounced.length >= 2 && !customer,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post<Ticket>('/tickets', {
        subject,
        description: description || undefined,
        customerId: customer!.id,
        category: category || undefined,
        priority: priority || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['ticket-stats'] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'خطا در ایجاد تیکت'),
  });

  const canSubmit = subject.trim().length >= 3 && customer && !create.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="تیکت جدید"
      footer={
        <div className="flex justify-end gap-2 px-5 py-4">
          <button className="btn-ghost" onClick={onClose}>
            انصراف
          </button>
          <button className="btn-accent" disabled={!canSubmit} onClick={() => create.mutate()}>
            ثبت تیکت
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* مشتری */}
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">مشتری</label>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-emerald-800">
                <Check size={15} /> {customer.displayName}
              </span>
              <button className="text-xs text-steel-500 hover:text-red-600" onClick={() => setCustomer(null)}>
                تغییر
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
                <input
                  className="input pr-9"
                  placeholder="جست‌وجوی نام مشتری…"
                  value={custQuery}
                  onChange={(e) => setCustQuery(e.target.value)}
                  autoFocus
                />
              </div>
              {customers.data && customers.data.data.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-lg border border-steel-100">
                  {customers.data.data.map((c) => (
                    <button
                      key={c.id}
                      className="block w-full px-3 py-2 text-right text-sm hover:bg-steel-50"
                      onClick={() => {
                        setCustomer(c);
                        setCustQuery('');
                      }}
                    >
                      {c.displayName}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* موضوع */}
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">موضوع</label>
          <input
            className="input"
            placeholder="مثلاً: پکیج آب گرم نمی‌دهد"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* توضیحات */}
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">شرح مشکل</label>
          <textarea
            className="input min-h-[90px]"
            placeholder="جزئیات مشکل مشتری…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* دسته/اولویت — اختیاری، هوش مصنوعی خودکار پر می‌کند */}
        <div className="rounded-lg bg-flame-50/60 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-flame-700">
            <Sparkles size={13} /> در صورت خالی‌گذاشتن، دسته و اولویت به‌صورت هوشمند تشخیص داده می‌شوند.
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">دسته (خودکار)</option>
              {Object.entries(TICKET_CATEGORY).map(([k, fa]) => (
                <option key={k} value={k}>
                  {fa}
                </option>
              ))}
            </select>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">اولویت (خودکار)</option>
              {Object.entries(TICKET_PRIORITY).map(([k, fa]) => (
                <option key={k} value={k}>
                  {fa}
                </option>
              ))}
            </select>
          </div>
        </div>

        {err && (
          <div className={clsx('rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700')}>{err}</div>
        )}
      </div>
    </Modal>
  );
}
