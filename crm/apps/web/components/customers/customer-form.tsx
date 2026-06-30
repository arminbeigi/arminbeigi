'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { CUSTOMER_TYPE } from '@/lib/enums';
import { Modal } from '@/components/ui/modal';
import type { Customer } from '@/lib/types';

interface PhoneInput {
  number: string;
  label: string;
}

export function CustomerFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (c: Customer) => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState('RESIDENTIAL');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phones, setPhones] = useState<PhoneInput[]>([{ number: '', label: 'موبایل' }]);
  const [error, setError] = useState<string | null>(null);

  const isCompany = type === 'COMPANY' || type === 'CONTRACTOR' || type === 'BUILDING_PROJECT';

  const reset = () => {
    setType('RESIDENTIAL');
    setDisplayName('');
    setCompanyName('');
    setPhones([{ number: '', label: 'موبایل' }]);
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const validPhones = phones
        .filter((p) => p.number.trim())
        .map((p) => ({ number: p.number.trim(), label: p.label || undefined, isPrimary: false }));
      if (validPhones[0]) validPhones[0].isPrimary = true;
      return api.post<Customer>('/customers', {
        type,
        displayName: displayName.trim(),
        ...(isCompany && companyName.trim() ? { companyName: companyName.trim() } : {}),
        ...(validPhones.length ? { phones: validPhones } : {}),
      });
    },
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onCreated?.(c);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'خطا در ثبت مشتری'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن مشتری"
      footer={
        <>
          <button
            className="btn-primary"
            disabled={mutation.isPending || !displayName.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'در حال ثبت…' : 'ثبت مشتری'}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">نوع مشتری</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CUSTOMER_TYPE).map(([key, fa]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`badge cursor-pointer px-3 py-1.5 ${
                  type === key ? 'bg-steel-700 text-white' : 'bg-steel-100 text-steel-600'
                }`}
              >
                {fa}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">نام نمایشی *</label>
          <input
            className="input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={isCompany ? 'نام شرکت/پیمانکار' : 'نام و نام خانوادگی'}
          />
        </div>

        {isCompany && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">نام شرکت</label>
            <input
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="نام رسمی شرکت"
            />
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-steel-700">شماره‌های تماس</label>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              onClick={() => setPhones([...phones, { number: '', label: '' }])}
            >
              <Plus size={14} /> افزودن شماره
            </button>
          </div>
          <div className="space-y-2">
            {phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input flex-1"
                  dir="ltr"
                  value={p.number}
                  onChange={(e) => {
                    const next = [...phones];
                    next[i] = { ...next[i], number: e.target.value };
                    setPhones(next);
                  }}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                />
                <input
                  className="input w-28"
                  value={p.label}
                  onChange={(e) => {
                    const next = [...phones];
                    next[i] = { ...next[i], label: e.target.value };
                    setPhones(next);
                  }}
                  placeholder="برچسب"
                />
                {phones.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost p-2 text-red-500"
                    onClick={() => setPhones(phones.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
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
