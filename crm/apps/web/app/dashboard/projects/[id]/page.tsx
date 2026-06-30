'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  PROJECT_STATUS,
  PROJECT_STATUS_TONE,
  PROJECT_TRANSITIONS,
  PROJECT_TYPE,
  label,
} from '@/lib/enums';
import { faDateTime, faNumber, faToman } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, ErrorState } from '@/components/ui/feedback';
import type { Project } from '@/lib/types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('projects:write');

  const [itTitle, setItTitle] = useState('');
  const [itQty, setItQty] = useState('1');
  const [itToman, setItToman] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const project = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get<Project>(`/projects/${id}`),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['project', id] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
  };

  const changeStatus = useMutation({
    mutationFn: (status: string) => api.patch<Project>(`/projects/${id}`, { status }),
    onSuccess: refresh,
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'خطا در تغییر وضعیت'),
  });
  const addItem = useMutation({
    mutationFn: () =>
      api.post<Project>(`/projects/${id}/items`, {
        title: itTitle.trim(),
        quantity: Number(itQty) || 1,
        ...(itToman ? { unitIrr: Number(itToman) * 10 } : {}),
      }),
    onSuccess: () => {
      setItTitle('');
      setItQty('1');
      setItToman('');
      refresh();
    },
  });
  const removeItem = useMutation({
    mutationFn: (itemId: string) => api.del<Project>(`/projects/${id}/items/${itemId}`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/projects/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] });
      router.push('/dashboard/projects');
    },
  });

  if (project.isLoading) return <Loading />;
  if (project.isError || !project.data) return <ErrorState message="پروژه یافت نشد" />;
  const p = project.data;
  const nextStatuses = PROJECT_TRANSITIONS[p.status] ?? [];

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/dashboard/projects')} className="btn-ghost px-0 text-sm">
        <ArrowRight size={16} /> بازگشت به فهرست
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-steel-900">{p.title}</h2>
              <div className="text-xs text-steel-400">
                {p.code} • {label(PROJECT_TYPE, p.type)}
              </div>
            </div>
            {hasPermission('projects:write') && (
              <button
                className="btn-ghost p-2 text-red-500"
                onClick={() => {
                  if (confirm('حذف این پروژه؟')) remove.mutate();
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          {/* گردش‌کار وضعیت */}
          <div className="mt-4 rounded-lg bg-steel-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="text-steel-500">وضعیت فعلی:</span>
              <Badge tone={PROJECT_STATUS_TONE[p.status]}>{label(PROJECT_STATUS, p.status)}</Badge>
            </div>
            {canWrite && nextStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="self-center text-xs text-steel-400">انتقال به:</span>
                {nextStatuses.map((s) => (
                  <button
                    key={s}
                    className="badge cursor-pointer border border-steel-300 bg-white px-3 py-1.5 text-steel-700 hover:bg-steel-100"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate(s)}
                  >
                    {label(PROJECT_STATUS, s)}
                  </button>
                ))}
              </div>
            )}
            {nextStatuses.length === 0 && (
              <div className="text-xs text-steel-400">این وضعیت پایانی است.</div>
            )}
            {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
          </div>

          {/* مشخصات فنی */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="مشتری">{p.customerName ?? '—'}</Field>
            <Field label="مدیر پروژه">{p.managerName ?? '—'}</Field>
            <Field label="متراژ">{p.buildingArea ? `${faNumber(p.buildingArea)} m²` : '—'}</Field>
            <Field label="طبقات">{p.floors ? faNumber(p.floors) : '—'}</Field>
            <Field label="واحدها">{p.units ? faNumber(p.units) : '—'}</Field>
            <Field label="بار حرارتی">{p.heatLoadKcal ? `${faNumber(p.heatLoadKcal)} kcal` : '—'}</Field>
            <Field label="برآورد">{p.estimatedIrr ? faToman(p.estimatedIrr) : '—'}</Field>
            <Field label="هزینه نهایی">{p.finalIrr ? faToman(p.finalIrr) : '—'}</Field>
            <Field label="تکمیل">{p.completedAt ? faDateTime(p.completedAt) : '—'}</Field>
          </div>
        </div>

        {/* اقلام */}
        <div className="card">
          <div className="border-b border-steel-100 px-5 py-4 font-bold text-steel-900">اقلام پروژه</div>
          <div className="divide-y divide-steel-50">
            {p.items.length === 0 && (
              <div className="p-6 text-center text-sm text-steel-400">قلمی ثبت نشده</div>
            )}
            {p.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-steel-800">{it.title}</div>
                  <div className="text-xs text-steel-400">
                    {faNumber(it.quantity)} × {faToman(it.unitIrr)}
                  </div>
                </div>
                {canWrite && (
                  <button className="btn-ghost p-1.5 text-red-500" onClick={() => removeItem.mutate(it.id)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {canWrite && (
            <div className="space-y-2 border-t border-steel-100 p-3">
              <input className="input" placeholder="عنوان قلم…" value={itTitle} onChange={(e) => setItTitle(e.target.value)} />
              <div className="flex gap-2">
                <input className="input w-20" dir="ltr" placeholder="تعداد" value={itQty} onChange={(e) => setItQty(e.target.value.replace(/[^\d]/g, ''))} />
                <input className="input flex-1" dir="ltr" placeholder="قیمت واحد (تومان)" value={itToman} onChange={(e) => setItToman(e.target.value.replace(/[^\d]/g, ''))} />
              </div>
              <button className="btn-primary w-full" disabled={!itTitle.trim() || addItem.isPending} onClick={() => addItem.mutate()}>
                <Plus size={16} /> افزودن قلم
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-steel-400">{l}</div>
      <div className="text-sm text-steel-800">{children}</div>
    </div>
  );
}
