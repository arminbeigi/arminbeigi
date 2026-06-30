'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Phone as PhoneIcon,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CALL_DIRECTION,
  CUSTOMER_STATUS,
  CUSTOMER_STATUS_TONE,
  CUSTOMER_TYPE,
  LEAD_SOURCE,
  label,
} from '@/lib/enums';
import { faDateTime, faDuration, faNumber, toFa } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, ErrorState } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import type { Call, Customer, Paginated } from '@/lib/types';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();

  const [newPhone, setNewPhone] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
  });

  const calls = useQuery({
    queryKey: ['customer-calls', id],
    queryFn: async () => (await api.get<Paginated<Call>>(`/calls?customerId=${id}&limit=5`)).data,
    enabled: !!id,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['customer', id] });
    void qc.invalidateQueries({ queryKey: ['customers'] });
  };

  const setStatus = useMutation({
    mutationFn: (status: string) => api.patch<Customer>(`/customers/${id}`, { status }),
    onSuccess: refresh,
  });
  const addPhone = useMutation({
    mutationFn: () => api.post<Customer>(`/customers/${id}/phones`, { number: newPhone.trim() }),
    onSuccess: () => {
      setNewPhone('');
      refresh();
    },
  });
  const removePhone = useMutation({
    mutationFn: (phoneId: string) => api.del<Customer>(`/customers/${id}/phones/${phoneId}`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => api.del(`/customers/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      router.push('/dashboard/customers');
    },
  });

  if (customer.isLoading) return <Loading />;
  if (customer.isError || !customer.data) return <ErrorState message="مشتری یافت نشد" />;
  const c = customer.data;

  return (
    <div className="space-y-5">
      <button onClick={() => router.push('/dashboard/customers')} className="btn-ghost px-0 text-sm">
        <ArrowRight size={16} /> بازگشت به فهرست
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* پروفایل */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-steel-700 text-lg font-bold text-white">
                {c.displayName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-steel-900">{c.displayName}</h2>
                <div className="text-xs text-steel-400">
                  {c.code} • {label(CUSTOMER_TYPE, c.type)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasPermission('customers:write') && (
                <button className="btn-ghost text-sm" onClick={() => setEditOpen(true)}>
                  ویرایش
                </button>
              )}
              {hasPermission('customers:delete') && (
                <button
                  className="btn-ghost p-2 text-red-500"
                  onClick={() => {
                    if (confirm('حذف این مشتری؟ این عملیات بازگشت‌ناپذیر است.')) remove.mutate();
                  }}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="وضعیت">
              {hasPermission('customers:write') ? (
                <select
                  className="input py-1 text-sm"
                  value={c.status}
                  onChange={(e) => setStatus.mutate(e.target.value)}
                >
                  {Object.entries(CUSTOMER_STATUS).map(([k, fa]) => (
                    <option key={k} value={k}>
                      {fa}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge tone={CUSTOMER_STATUS_TONE[c.status]}>{label(CUSTOMER_STATUS, c.status)}</Badge>
              )}
            </Field>
            <Field label="امتیاز سرنخ">
              <span className="inline-flex items-center gap-1 font-medium">
                <Star size={14} className="text-amber-400" /> {faNumber(c.leadScore)}
              </span>
            </Field>
            <Field label="کارشناس">{c.ownerName ?? '—'}</Field>
            {c.companyName && <Field label="شرکت">{c.companyName}</Field>}
            <Field label="تاریخ ثبت">{faDateTime(c.createdAt)}</Field>
          </div>

          {/* شماره‌ها */}
          <div className="mt-6">
            <div className="mb-2 text-sm font-medium text-steel-700">شماره‌های تماس</div>
            <div className="space-y-2">
              {c.phones.length === 0 && <div className="text-sm text-steel-400">شماره‌ای ثبت نشده</div>}
              {c.phones.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-steel-100 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <PhoneIcon size={15} className="text-steel-400" />
                    <span dir="ltr" className="font-medium text-steel-800">
                      {toFa(p.number)}
                    </span>
                    {p.label && <span className="text-xs text-steel-400">{p.label}</span>}
                    {p.isPrimary && <Badge tone="bg-steel-100 text-steel-600">اصلی</Badge>}
                  </div>
                  {hasPermission('customers:write') && c.phones.length > 0 && (
                    <button
                      className="btn-ghost p-1.5 text-red-500"
                      onClick={() => removePhone.mutate(p.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {hasPermission('customers:write') && (
              <div className="mt-2 flex gap-2">
                <input
                  className="input flex-1"
                  dir="ltr"
                  placeholder="افزودن شماره جدید…"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newPhone.trim() && addPhone.mutate()}
                />
                <button
                  className="btn-primary"
                  disabled={!newPhone.trim() || addPhone.isPending}
                  onClick={() => addPhone.mutate()}
                >
                  <Plus size={16} /> افزودن
                </button>
              </div>
            )}
          </div>
        </div>

        {/* تماس‌های مشتری */}
        <div className="card">
          <div className="border-b border-steel-100 px-5 py-4 font-bold text-steel-900">
            تماس‌های اخیر
          </div>
          <div className="divide-y divide-steel-50">
            {calls.isLoading && <Loading />}
            {calls.data?.length === 0 && (
              <div className="p-6 text-center text-sm text-steel-400">تماسی ثبت نشده</div>
            )}
            {calls.data?.map((call) => (
              <div key={call.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    call.direction === 'INBOUND'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-steel-100 text-steel-700'
                  }`}
                >
                  {call.direction === 'INBOUND' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </span>
                <div className="flex-1">
                  <div className="text-sm text-steel-700">{label(CALL_DIRECTION, call.direction)}</div>
                  <div className="text-xs text-steel-400">{faDateTime(call.startedAt)}</div>
                </div>
                <div className="text-xs text-steel-400">{faDuration(call.talkSeconds)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <EditModal customer={c} open={editOpen} onClose={() => setEditOpen(false)} onSaved={refresh} />
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

function EditModal({
  customer,
  open,
  onClose,
  onSaved,
}: {
  customer: Customer;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState(customer.displayName);
  const [companyName, setCompanyName] = useState(customer.companyName ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.patch<Customer>(`/customers/${customer.id}`, {
        displayName: displayName.trim(),
        companyName: companyName.trim() || undefined,
      }),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'خطا در ذخیره'),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ویرایش مشتری"
      footer={
        <>
          <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            ذخیره
          </button>
          <button className="btn-ghost" onClick={onClose}>
            انصراف
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">نام نمایشی</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-steel-700">نام شرکت</label>
          <input className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
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
