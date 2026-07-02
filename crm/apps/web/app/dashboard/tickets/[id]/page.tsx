'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Sparkles,
  UserPlus,
  UserMinus,
  Send,
  Lock,
  Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  TICKET_STATUS,
  TICKET_STATUS_TONE,
  TICKET_PRIORITY,
  TICKET_PRIORITY_TONE,
  TICKET_CATEGORY,
  TICKET_TRANSITIONS,
  PRODUCT_CATEGORY,
  label,
} from '@/lib/enums';
import { faDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, ErrorState } from '@/components/ui/feedback';
import type { AiInsight, Ticket } from '@/lib/types';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [comment, setComment] = useState('');
  const [internal, setInternal] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ticket = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
  });

  const t = ticket.data;

  const insight = useQuery({
    queryKey: ['ticket-insight', id, t?.customerId],
    queryFn: () =>
      api.get<AiInsight[] | { data: AiInsight[] }>(
        `/ai/insights?type=TICKET_CLASSIFICATION&customerId=${t!.customerId}`,
      ),
    enabled: !!t?.customerId,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['ticket', id] });
    void qc.invalidateQueries({ queryKey: ['tickets'] });
    void qc.invalidateQueries({ queryKey: ['ticket-stats'] });
  };

  const changeStatus = useMutation({
    mutationFn: (status: string) => api.patch<Ticket>(`/tickets/${id}/status`, { status }),
    onSuccess: invalidate,
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا در تغییر وضعیت'),
  });

  const assign = useMutation({
    mutationFn: (assigneeId: string | null) => api.patch<Ticket>(`/tickets/${id}/assign`, { assigneeId }),
    onSuccess: invalidate,
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا در تخصیص'),
  });

  const addComment = useMutation({
    mutationFn: () => api.post<Ticket>(`/tickets/${id}/comments`, { body: comment, isInternal: internal }),
    onSuccess: () => {
      setComment('');
      setInternal(false);
      invalidate();
    },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا در ثبت پاسخ'),
  });

  if (ticket.isLoading) return <Loading />;
  if (ticket.isError || !t) return <ErrorState message="تیکت یافت نشد" />;

  const insights = Array.isArray(insight.data) ? insight.data : insight.data?.data ?? [];
  const cls = insights.find((i) => i.ticketId === id);
  const clsPayload = (cls?.payload ?? {}) as { component?: string | null };
  const canWrite = hasPermission('tickets:write');

  return (
    <div className="space-y-4">
      {/* سربرگ */}
      <div className="flex items-center gap-2 text-sm text-steel-500">
        <Link href="/dashboard/tickets" className="flex items-center gap-1 hover:text-flame-600">
          <ArrowRight size={16} /> تیکت‌ها
        </Link>
        <span>/</span>
        <span className="font-mono text-xs">{t.code.slice(-8)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ستون اصلی */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={TICKET_STATUS_TONE[t.status]}>{label(TICKET_STATUS, t.status)}</Badge>
              <Badge tone={TICKET_PRIORITY_TONE[t.priority]}>
                اولویت: {label(TICKET_PRIORITY, t.priority)}
              </Badge>
              <Badge>{label(TICKET_CATEGORY, t.category)}</Badge>
            </div>
            <h1 className="text-xl font-bold text-steel-900">{t.subject}</h1>
            {t.description && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-steel-700">{t.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-steel-400">
              <span>ایجاد: {faDateTime(t.createdAt)}</span>
              {t.slaDueAt && (
                <span className="flex items-center gap-1">
                  <Clock size={12} /> مهلت SLA: {faDateTime(t.slaDueAt)}
                </span>
              )}
              {t.resolvedAt && <span>حل‌شده: {faDateTime(t.resolvedAt)}</span>}
            </div>
          </div>

          {/* گفت‌وگو / کامنت‌ها */}
          <div className="card">
            <div className="border-b border-steel-100 px-5 py-3 font-bold text-steel-900">
              گفت‌وگو و یادداشت‌ها
            </div>
            <div className="divide-y divide-steel-50">
              {t.comments && t.comments.length > 0 ? (
                t.comments.map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <div className="mb-1 flex items-center gap-2 text-xs text-steel-400">
                      <span className="font-medium text-steel-600">{c.authorName ?? 'کاربر'}</span>
                      {c.isInternal && (
                        <span className="flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                          <Lock size={10} /> داخلی
                        </span>
                      )}
                      <span>{faDateTime(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-steel-700">{c.body}</p>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-steel-400">هنوز پاسخی ثبت نشده است</div>
              )}
            </div>

            {canWrite && (
              <div className="border-t border-steel-100 p-4">
                <textarea
                  className="input min-h-[70px]"
                  placeholder="پاسخ یا یادداشت خود را بنویسید…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-steel-600">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    یادداشت داخلی (به مشتری نمایش داده نمی‌شود)
                  </label>
                  <button
                    className="btn-accent"
                    disabled={!comment.trim() || addComment.isPending}
                    onClick={() => addComment.mutate()}
                  >
                    <Send size={16} /> ثبت پاسخ
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ستون کناری */}
        <div className="space-y-4">
          {/* مشتری */}
          <div className="card p-5">
            <div className="text-xs text-steel-500">مشتری</div>
            {t.customerId ? (
              <Link href={`/dashboard/customers/${t.customerId}`} className="mt-1 block font-bold text-flame-600 hover:underline">
                {t.customerName ?? '—'}
              </Link>
            ) : (
              <div className="mt-1 font-bold text-steel-800">{t.customerName ?? '—'}</div>
            )}
            {t.projectTitle && (
              <div className="mt-2 text-xs text-steel-500">پروژه: {t.projectTitle}</div>
            )}
          </div>

          {/* دسته‌بندی هوشمند */}
          {cls && (
            <div className="card border border-flame-100 bg-flame-50/40 p-5">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-flame-700">
                <Sparkles size={15} /> دسته‌بندی هوشمند
              </div>
              <div className="space-y-1 text-sm text-steel-700">
                <div>دسته پیشنهادی: {label(TICKET_CATEGORY, t.category)}</div>
                <div>اولویت پیشنهادی: {label(TICKET_PRIORITY, t.priority)}</div>
                {clsPayload.component && (
                  <div>تجهیز مرتبط: {label(PRODUCT_CATEGORY, clsPayload.component)}</div>
                )}
                {typeof cls.confidence === 'number' && (
                  <div className="text-xs text-steel-400">
                    اطمینان: {Math.round((cls.confidence ?? 0) * 100)}٪ · موتور: {cls.model}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* تغییر وضعیت */}
          {canWrite && (
            <div className="card p-5">
              <div className="mb-2 text-xs text-steel-500">تغییر وضعیت</div>
              <div className="flex flex-wrap gap-2">
                {(TICKET_TRANSITIONS[t.status] ?? []).map((s) => (
                  <button
                    key={s}
                    className="rounded-lg bg-steel-50 px-3 py-1.5 text-xs font-medium text-steel-700 hover:bg-flame-50 hover:text-flame-700 disabled:opacity-50"
                    disabled={changeStatus.isPending}
                    onClick={() => changeStatus.mutate(s)}
                  >
                    {label(TICKET_STATUS, s)}
                  </button>
                ))}
                {(TICKET_TRANSITIONS[t.status] ?? []).length === 0 && (
                  <span className="text-xs text-steel-400">وضعیت نهایی</span>
                )}
              </div>
            </div>
          )}

          {/* تخصیص */}
          {canWrite && (
            <div className="card p-5">
              <div className="mb-2 text-xs text-steel-500">مسئول</div>
              <div className="mb-3 font-medium text-steel-800">{t.assigneeName ?? 'تخصیص‌نیافته'}</div>
              <div className="flex gap-2">
                {t.assigneeId !== user?.id && (
                  <button
                    className="btn-primary flex-1"
                    disabled={assign.isPending}
                    onClick={() => assign.mutate(user!.id)}
                  >
                    <UserPlus size={15} /> به من واگذار کن
                  </button>
                )}
                {t.assigneeId && (
                  <button className="btn-ghost" disabled={assign.isPending} onClick={() => assign.mutate(null)}>
                    <UserMinus size={15} /> لغو
                  </button>
                )}
              </div>
            </div>
          )}

          {msg && (
            <div className={clsx('rounded-lg bg-steel-100 px-3 py-2 text-center text-sm text-steel-700')}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
