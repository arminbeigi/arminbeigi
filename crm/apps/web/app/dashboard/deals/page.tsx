'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoveRight, Plus, Trophy, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { faToman } from '@/lib/format';
import { Loading } from '@/components/ui/feedback';
import { Modal } from '@/components/ui/modal';
import { DealFormModal } from '@/components/deals/deal-form';
import type { Deal, DealStage, Pipeline, Paginated } from '@/lib/types';

export default function DealsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canWrite = hasPermission('deals:write');
  const [showForm, setShowForm] = useState(false);
  const [losePending, setLosePending] = useState<{ dealId: string; stageId: string } | null>(null);
  const [lostReason, setLostReason] = useState('');

  const pipelines = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get<Pipeline[]>('/deals/pipelines'),
  });
  const pipeline = pipelines.data?.[0];

  const deals = useQuery({
    queryKey: ['deals-board', pipeline?.id],
    queryFn: async () =>
      (await api.get<Paginated<Deal>>(`/deals?pipelineId=${pipeline!.id}&limit=100`)).data,
    enabled: !!pipeline,
  });

  const move = useMutation({
    mutationFn: (vars: { dealId: string; stageId: string; lostReason?: string }) =>
      api.post<Deal>(`/deals/${vars.dealId}/move`, {
        stageId: vars.stageId,
        ...(vars.lostReason ? { lostReason: vars.lostReason } : {}),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['deals-board'] }),
  });

  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const d of deals.data ?? []) (map[d.stageId] ??= []).push(d);
    return map;
  }, [deals.data]);

  const handleMove = (dealId: string, stage: DealStage) => {
    if (stage.isLost) {
      setLostReason('');
      setLosePending({ dealId, stageId: stage.id });
    } else {
      move.mutate({ dealId, stageId: stage.id });
    }
  };

  if (pipelines.isLoading || !pipeline) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-steel-900">{pipeline.name}</h2>
          <p className="text-xs text-steel-400">معاملات را با کشیدن یا منوی انتقال جابه‌جا کنید</p>
        </div>
        {canWrite && (
          <button className="btn-accent" onClick={() => setShowForm(true)}>
            <Plus size={18} /> افزودن معامله
          </button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {pipeline.stages.map((stage) => {
          const list = byStage[stage.id] ?? [];
          const total = list.reduce((s, d) => s + Number(d.amountIrr), 0);
          return (
            <div
              key={stage.id}
              className="flex w-72 shrink-0 flex-col rounded-xl bg-steel-100/60"
              onDragOver={(e) => canWrite && e.preventDefault()}
              onDrop={(e) => {
                if (!canWrite) return;
                const id = e.dataTransfer.getData('text/plain');
                if (id) handleMove(id, stage);
              }}
            >
              <div className="flex items-center justify-between border-b border-steel-200 px-3 py-2.5">
                <div className="flex items-center gap-1.5 font-medium text-steel-700">
                  {stage.isWon && <Trophy size={14} className="text-emerald-600" />}
                  {stage.isLost && <XCircle size={14} className="text-red-500" />}
                  {stage.name}
                </div>
                <span className="badge bg-white text-steel-500">{toFaCount(list.length)}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: '65vh' }}>
                {list.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    stages={pipeline.stages}
                    canWrite={canWrite}
                    onMove={handleMove}
                  />
                ))}
              </div>
              {total > 0 && (
                <div className="border-t border-steel-200 px-3 py-2 text-xs text-steel-500">
                  مجموع: {faToman(total)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <DealFormModal open={showForm} onClose={() => setShowForm(false)} />

      {/* مودال دلیل ازدست‌رفتن */}
      <Modal
        open={!!losePending}
        onClose={() => setLosePending(null)}
        title="بستن معامله به‌عنوان ازدست‌رفته"
        footer={
          <>
            <button
              className="btn-accent"
              disabled={!lostReason.trim()}
              onClick={() => {
                if (losePending)
                  move.mutate(
                    { ...losePending, lostReason: lostReason.trim() },
                    { onSuccess: () => setLosePending(null) },
                  );
              }}
            >
              ثبت
            </button>
            <button className="btn-ghost" onClick={() => setLosePending(null)}>
              انصراف
            </button>
          </>
        }
      >
        <label className="mb-1.5 block text-sm font-medium text-steel-700">دلیل ازدست‌رفتن *</label>
        <textarea
          className="input min-h-24"
          value={lostReason}
          onChange={(e) => setLostReason(e.target.value)}
          placeholder="مثلاً قیمت بالا، انتخاب رقیب…"
        />
      </Modal>
    </div>
  );
}

function DealCard({
  deal,
  stages,
  canWrite,
  onMove,
}: {
  deal: Deal;
  stages: DealStage[];
  canWrite: boolean;
  onMove: (dealId: string, stage: DealStage) => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <div
      draggable={canWrite}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', deal.id)}
      className="card cursor-grab p-3 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-steel-900">{deal.title}</div>
        {canWrite && (
          <div className="relative">
            <button
              className="btn-ghost p-1 text-steel-400"
              onClick={() => setMenu((m) => !m)}
              aria-label="انتقال"
            >
              <MoveRight size={16} />
            </button>
            {menu && (
              <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-steel-200 bg-white py-1 shadow-lg">
                <div className="px-3 py-1 text-[11px] text-steel-400">انتقال به:</div>
                {stages
                  .filter((s) => s.id !== deal.stageId)
                  .map((s) => (
                    <button
                      key={s.id}
                      className="block w-full px-3 py-1.5 text-right text-sm hover:bg-steel-50"
                      onClick={() => {
                        setMenu(false);
                        onMove(deal.id, s);
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-1 text-xs text-steel-400">{deal.customerName ?? '—'}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-medium text-flame-600">{faToman(deal.amountIrr)}</span>
        {deal.ownerName && <span className="text-[11px] text-steel-400">{deal.ownerName}</span>}
      </div>
    </div>
  );
}

function toFaCount(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}
