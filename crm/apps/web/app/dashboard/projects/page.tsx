'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebounce } from '@/lib/use-debounce';
import { PROJECT_STATUS, PROJECT_STATUS_TONE, PROJECT_TYPE, label } from '@/lib/enums';
import { faDateTime, faToman } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, EmptyState, ErrorState } from '@/components/ui/feedback';
import { Pagination } from '@/components/ui/pagination';
import { ProjectFormModal } from '@/components/projects/project-form';
import type { Project, Paginated } from '@/lib/types';

export default function ProjectsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const debouncedQ = useDebounce(q);

  const query = useQuery({
    queryKey: ['projects', { q: debouncedQ, type, status, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      return api.get<Paginated<Project>>(`/projects?${params.toString()}`);
    },
  });

  const resetPageAnd = (fn: () => void) => () => {
    setPage(1);
    fn();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            className="input pr-9"
            placeholder="جست‌وجوی عنوان پروژه…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
        {hasPermission('projects:write') && (
          <button className="btn-accent" onClick={() => setShowForm(true)}>
            <Plus size={18} /> افزودن پروژه
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!type} onClick={resetPageAnd(() => setType(''))}>همه انواع</Chip>
        {Object.entries(PROJECT_TYPE).map(([k, fa]) => (
          <Chip key={k} active={type === k} onClick={resetPageAnd(() => setType(k))}>{fa}</Chip>
        ))}
        <span className="mx-1 w-px bg-steel-200" />
        <Chip active={!status} onClick={resetPageAnd(() => setStatus(''))}>همه وضعیت‌ها</Chip>
        {Object.entries(PROJECT_STATUS).map(([k, fa]) => (
          <Chip key={k} active={status === k} onClick={resetPageAnd(() => setStatus(k))}>{fa}</Chip>
        ))}
      </div>

      <div className="card overflow-hidden">
        {query.isLoading && <Loading />}
        {query.isError && <ErrorState message="خطا در دریافت پروژه‌ها" />}
        {query.data?.data.length === 0 && (
          <EmptyState title="پروژه‌ای یافت نشد" hint="عبارت جست‌وجو یا فیلترها را تغییر دهید" />
        )}
        {query.data && query.data.data.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-steel-100 text-steel-500">
                <th className="px-4 py-3 text-right font-medium">عنوان</th>
                <th className="px-4 py-3 text-right font-medium">نوع</th>
                <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                <th className="px-4 py-3 text-right font-medium">مشتری</th>
                <th className="px-4 py-3 text-right font-medium">برآورد</th>
                <th className="px-4 py-3 text-right font-medium">ثبت</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/dashboard/projects/${p.id}`)}
                  className="cursor-pointer border-b border-steel-50 hover:bg-steel-50"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-steel-900">{p.title}</div>
                    <div className="text-xs text-steel-400">{p.code}</div>
                  </td>
                  <td className="px-4 py-3 text-steel-600">{label(PROJECT_TYPE, p.type)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={PROJECT_STATUS_TONE[p.status]}>{label(PROJECT_STATUS, p.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-steel-600">{p.customerName ?? '—'}</td>
                  <td className="px-4 py-3 text-steel-600">{p.estimatedIrr ? faToman(p.estimatedIrr) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-steel-400">{faDateTime(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <Pagination page={query.data.meta.page} pages={query.data.meta.pages} total={query.data.meta.total} onChange={setPage} />
      )}

      <ProjectFormModal open={showForm} onClose={() => setShowForm(false)} onCreated={(p) => router.push(`/dashboard/projects/${p.id}`)} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'badge cursor-pointer px-3 py-1.5 transition-colors',
        active ? 'bg-steel-700 text-white' : 'bg-white text-steel-600 border border-steel-200 hover:bg-steel-50',
      )}
    >
      {children}
    </button>
  );
}
