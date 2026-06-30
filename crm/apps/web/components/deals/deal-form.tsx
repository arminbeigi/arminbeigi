'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { CustomerSelect } from '@/components/customers/customer-select';
import type { Deal } from '@/lib/types';

export function DealFormModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amountToman, setAmountToman] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setCustomerId('');
    setCustomerName('');
    setAmountToman('');
    setError(null);
  };

  const create = useMutation({
    mutationFn: () =>
      api.post<Deal>('/deals', {
        title: title.trim(),
        customerId,
        ...(amountToman ? { amountIrr: Number(amountToman) * 10 } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['deals-board'] });
      reset();
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'خطا در ثبت معامله'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن معامله"
      footer={
        <>
          <button
            className="btn-primary"
            disabled={create.isPending || !title.trim() || !customerId}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'در حال ثبت…' : 'ثبت معامله'}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">عنوان معامله *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً فروش موتورخانه مجتمع…" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">مشتری *</label>
          <CustomerSelect
            value={customerId}
            valueName={customerName}
            onChange={(id, name) => {
              setCustomerId(id);
              setCustomerName(name);
            }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">مبلغ تخمینی (تومان)</label>
          <input
            className="input"
            dir="ltr"
            inputMode="numeric"
            value={amountToman}
            onChange={(e) => setAmountToman(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
