'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { PROJECT_TYPE } from '@/lib/enums';
import { Modal } from '@/components/ui/modal';
import { CustomerSelect } from '@/components/customers/customer-select';
import type { Project } from '@/lib/types';

export function ProjectFormModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (p: Project) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('ENGINE_ROOM');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [buildingArea, setBuildingArea] = useState('');
  const [units, setUnits] = useState('');
  const [estimatedToman, setEstimatedToman] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setType('ENGINE_ROOM');
    setCustomerId('');
    setCustomerName('');
    setBuildingArea('');
    setUnits('');
    setEstimatedToman('');
    setError(null);
  };

  const create = useMutation({
    mutationFn: () =>
      api.post<Project>('/projects', {
        title: title.trim(),
        type,
        customerId,
        ...(buildingArea ? { buildingArea: Number(buildingArea) } : {}),
        ...(units ? { units: Number(units) } : {}),
        ...(estimatedToman ? { estimatedIrr: Number(estimatedToman) * 10 } : {}),
      }),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      reset();
      onCreated?.(p);
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'خطا در ثبت پروژه'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="افزودن پروژه"
      footer={
        <>
          <button
            className="btn-primary"
            disabled={create.isPending || !title.trim() || !customerId}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'در حال ثبت…' : 'ثبت پروژه'}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">نوع پروژه</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PROJECT_TYPE).map(([k, fa]) => (
              <button
                key={k}
                type="button"
                onClick={() => setType(k)}
                className={`badge cursor-pointer px-3 py-1.5 ${
                  type === k ? 'bg-steel-700 text-white' : 'bg-steel-100 text-steel-600'
                }`}
              >
                {fa}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">عنوان پروژه *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً موتورخانه مجتمع…" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">مشتری *</label>
          <CustomerSelect value={customerId} valueName={customerName} onChange={(id, name) => { setCustomerId(id); setCustomerName(name); }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">متراژ (m²)</label>
            <input className="input" dir="ltr" inputMode="numeric" value={buildingArea} onChange={(e) => setBuildingArea(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">تعداد واحد</label>
            <input className="input" dir="ltr" inputMode="numeric" value={units} onChange={(e) => setUnits(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-steel-500">برآورد (تومان)</label>
            <input className="input" dir="ltr" inputMode="numeric" value={estimatedToman} onChange={(e) => setEstimatedToman(e.target.value.replace(/[^\d]/g, ''))} />
          </div>
        </div>
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
      </div>
    </Modal>
  );
}
