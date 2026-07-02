'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Plus, Search, Check } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/use-debounce';
import { ASSET_KIND, ASSET_STATUS, ASSET_STATUS_TONE, label } from '@/lib/enums';
import { faDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import type { Asset, Customer, Paginated } from '@/lib/types';

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-xs font-medium transition',
        active ? 'bg-flame-600 text-white' : 'bg-steel-50 text-steel-600 hover:bg-steel-100',
      )}
    >
      {children}
    </button>
  );
}

function AssetForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('WALL_BOILER');
  const [serial, setSerial] = useState('');
  const [warranty, setWarranty] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [custQ, setCustQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const dq = useDebounce(custQ);

  const customers = useQuery({
    queryKey: ['asset-cust', dq],
    queryFn: () => api.get<Paginated<Customer>>(`/customers?q=${encodeURIComponent(dq)}&limit=6`),
    enabled: dq.length >= 2 && !customer,
  });

  const create = useMutation({
    mutationFn: () =>
      api.post('/assets', {
        name,
        kind,
        customerId: customer!.id,
        serialNumber: serial || undefined,
        warrantyUntil: warranty || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assets'] });
      onClose();
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'خطا در ثبت تجهیز'),
  });

  const canSubmit = name.trim().length >= 2 && customer && !create.isPending;

  return (
    <Modal
      open
      onClose={onClose}
      title="تجهیز جدید"
      footer={
        <div className="flex justify-end gap-2 px-5 py-4">
          <button className="btn-ghost" onClick={onClose}>انصراف</button>
          <button className="btn-accent" disabled={!canSubmit} onClick={() => create.mutate()}>ثبت</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">مشتری مالک</label>
          {customer ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-emerald-800"><Check size={15} /> {customer.displayName}</span>
              <button className="text-xs text-steel-500 hover:text-red-600" onClick={() => setCustomer(null)}>تغییر</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
                <input className="input pr-9" placeholder="جست‌وجوی مشتری…" value={custQ} onChange={(e) => setCustQ(e.target.value)} autoFocus />
              </div>
              {customers.data && customers.data.data.length > 0 && (
                <div className="mt-1 overflow-hidden rounded-lg border border-steel-100">
                  {customers.data.data.map((c) => (
                    <button key={c.id} className="block w-full px-3 py-2 text-right text-sm hover:bg-steel-50" onClick={() => { setCustomer(c); setCustQ(''); }}>
                      {c.displayName}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">نام تجهیز</label>
          <input className="input" placeholder="مثلاً: پکیج دیواری بوتان ۲۴۰۰۰" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-steel-700">نوع</label>
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(ASSET_KIND).map(([k, fa]) => <option key={k} value={k}>{fa}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-steel-700">شماره سریال</label>
            <input className="input" dir="ltr" value={serial} onChange={(e) => setSerial(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-steel-700">پایان گارانتی</label>
          <input className="input" type="date" dir="ltr" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
        </div>
        {err && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      </div>
    </Modal>
  );
}

export default function AssetsPage() {
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const dq = useDebounce(q);

  const query = useQuery({
    queryKey: ['assets', { q: dq, kind, status, page }],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: '15' });
      if (dq) p.set('q', dq);
      if (kind) p.set('kind', kind);
      if (status) p.set('status', status);
      return api.get<Paginated<Asset>>(`/assets?${p.toString()}`);
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input className="input pr-9" placeholder="جست‌وجوی نام/سریال/کد تجهیز…" value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} />
        </div>
        {hasPermission('assets:write') && (
          <button className="btn-accent" onClick={() => setCreating(true)}><Plus size={18} /> تجهیز جدید</button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!kind} onClick={() => { setPage(1); setKind(''); }}>همه انواع</Chip>
        {Object.entries(ASSET_KIND).map(([k, fa]) => (
          <Chip key={k} active={kind === k} onClick={() => { setPage(1); setKind(k); }}>{fa}</Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active={!status} onClick={() => { setPage(1); setStatus(''); }}>همه وضعیت‌ها</Chip>
        {Object.entries(ASSET_STATUS).map(([k, fa]) => (
          <Chip key={k} active={status === k} onClick={() => { setPage(1); setStatus(k); }}>{fa}</Chip>
        ))}
      </div>

      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت تجهیزات" />}
        {query.data?.data.length === 0 && <EmptyState title="تجهیزی یافت نشد" hint="تجهیز جدید ثبت کنید" />}
        {query.data && query.data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 text-steel-500">
                <th className="px-4 py-3 text-right font-medium">کد</th>
                <th className="px-4 py-3 text-right font-medium">نام</th>
                <th className="px-4 py-3 text-right font-medium">نوع</th>
                <th className="px-4 py-3 text-right font-medium">سریال</th>
                <th className="px-4 py-3 text-right font-medium">مشتری</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium">پایان گارانتی</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((a) => (
                <tr key={a.id} className="border-b border-steel-50 last:border-0 hover:bg-steel-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-steel-500">{a.code.slice(-6)}</td>
                  <td className="px-4 py-3 font-medium text-steel-800">{a.name}</td>
                  <td className="px-4 py-3 text-steel-600">{label(ASSET_KIND, a.kind)}</td>
                  <td className="px-4 py-3 text-steel-500" dir="ltr">{a.serialNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-600">{a.customer?.displayName ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={ASSET_STATUS_TONE[a.status]}>{label(ASSET_STATUS, a.status)}</Badge></td>
                  <td className="px-4 py-3 text-xs text-steel-400">{a.warrantyUntil ? faDateTime(a.warrantyUntil) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <Pagination page={page} pages={query.data.meta.pages} total={query.data.meta.total} onChange={setPage} />
      )}

      {creating && <AssetForm onClose={() => setCreating(false)} />}

      {!query.data && !query.isLoading && (
        <div className="flex items-center justify-center gap-2 py-10 text-steel-400"><Boxes size={18} /> تجهیزات HVAC</div>
      )}
    </div>
  );
}
