'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, FileAudio, Package, Sparkles, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  CALL_DIRECTION,
  CALL_INTENT,
  CALL_INTENT_TONE,
  CALL_STATUS,
  PRODUCT_CATEGORY,
  label,
} from '@/lib/enums';
import { CALL_STATUS_TONE } from '@/lib/call-style';
import { faDateTime, faDuration, faNumber, toFa } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loading, ErrorState, Spinner } from '@/components/ui/feedback';
import type { Call, CallAnalysis } from '@/lib/types';

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);

  const call = useQuery({
    queryKey: ['call', id],
    queryFn: () => api.get<Call>(`/calls/${id}`),
  });

  const process = useMutation({
    mutationFn: () => api.post<CallAnalysis>(`/ai/calls/${id}/process`, {}),
    onSuccess: (res) => {
      setAnalysis(res);
      void qc.invalidateQueries({ queryKey: ['call', id] });
    },
  });

  if (call.isLoading) return <Loading />;
  if (call.isError || !call.data) return <ErrorState message="تماس یافت نشد" />;
  const c = call.data;
  const result = analysis;
  const intent = result?.intent ?? c.intent;

  return (
    <div className="space-y-5">
      <button onClick={() => router.back()} className="btn-ghost px-0 text-sm">
        <ArrowRight size={16} /> بازگشت
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* اطلاعات تماس */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-steel-900">
                {c.customerName ?? toFa(c.fromNumber)}
              </h2>
              <div className="text-xs text-steel-400" dir="ltr">
                {toFa(c.fromNumber)} ← {toFa(c.toNumber)}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge tone={CALL_STATUS_TONE[c.status]}>{label(CALL_STATUS, c.status)}</Badge>
              <Badge tone={CALL_INTENT_TONE[intent]}>{label(CALL_INTENT, intent)}</Badge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="جهت">{label(CALL_DIRECTION, c.direction)}</Field>
            <Field label="اپراتور">{c.agentName ?? '—'}</Field>
            <Field label="مدت مکالمه">{faDuration(c.talkSeconds)}</Field>
            <Field label="شروع">{faDateTime(c.startedAt)}</Field>
            {c.queue && <Field label="صف">{c.queue}</Field>}
            {c.customerId && (
              <Field label="مشتری">
                <Link href={`/dashboard/customers/${c.customerId}`} className="text-steel-700 hover:text-flame-600">
                  {c.customerName}
                </Link>
              </Field>
            )}
          </div>

          {c.recordingUrl && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-steel-50 px-3 py-2 text-sm text-steel-600">
              <FileAudio size={16} className="text-steel-400" />
              <span dir="ltr">{c.recordingUrl}</span>
            </div>
          )}

          {(result?.transcript || c.transcript) && (
            <div className="mt-4">
              <div className="mb-1 text-xs text-steel-400">متن مکالمه (رونویسی)</div>
              <p className="rounded-lg border border-steel-100 bg-steel-50/50 p-3 text-sm leading-7 text-steel-700">
                {result?.transcript ?? c.transcript}
              </p>
            </div>
          )}
        </div>

        {/* پنل هوش مصنوعی */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 font-bold text-steel-900">
            <Sparkles size={18} className="text-flame-600" /> تحلیل هوشمند
          </div>

          {!hasPermission('ai:use') ? (
            <p className="text-sm text-steel-400">برای تحلیل هوشمند به مجوز دسترسی ندارید.</p>
          ) : (
            <>
              <button
                className="btn-accent w-full"
                disabled={process.isPending}
                onClick={() => process.mutate()}
              >
                {process.isPending ? <Spinner className="text-white" /> : <Sparkles size={16} />}
                {process.isPending ? 'در حال تحلیل…' : 'تحلیل با هوش مصنوعی'}
              </button>

              {result && (
                <div className="mt-4 space-y-4">
                  {result.summary && (
                    <div>
                      <div className="mb-1 text-xs text-steel-400">خلاصه</div>
                      <p className="text-sm text-steel-700">{result.summary}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="mb-1 text-xs text-steel-400">نیت</div>
                      <Badge tone={CALL_INTENT_TONE[result.intent]}>{label(CALL_INTENT, result.intent)}</Badge>
                    </div>
                    {result.leadScore != null && (
                      <div>
                        <div className="mb-1 text-xs text-steel-400">امتیاز سرنخ</div>
                        <span className="inline-flex items-center gap-1 font-bold text-steel-800">
                          <Star size={15} className="text-amber-400" /> {faNumber(result.leadScore)}
                        </span>
                      </div>
                    )}
                  </div>

                  {result.recommendations.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-steel-400">
                        <Package size={14} /> محصولات پیشنهادی
                      </div>
                      <div className="space-y-1.5">
                        {result.recommendations.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg border border-steel-100 px-3 py-2 text-sm">
                            <span className="font-medium text-steel-800">{p.name}</span>
                            <span className="text-xs text-steel-400">{label(PRODUCT_CATEGORY, p.category)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!result && !process.isPending && (
                <p className="mt-3 text-xs text-steel-400">
                  با زدن دکمه، تماس رونویسی و خلاصه می‌شود، نیت تشخیص داده می‌شود، امتیاز سرنخ محاسبه و محصول پیشنهاد می‌شود.
                </p>
              )}
            </>
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
