import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'steel',
  loading,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: 'steel' | 'flame' | 'green';
  loading?: boolean;
}) {
  const tones = {
    steel: 'bg-steel-100 text-steel-700',
    flame: 'bg-flame-100 text-flame-600',
    green: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={clsx('grid h-12 w-12 place-items-center rounded-xl', tones[tone])}>
        <Icon size={22} />
      </span>
      <div>
        <div className="text-sm text-steel-500">{label}</div>
        <div className="text-2xl font-bold text-steel-900">
          {loading ? <span className="text-steel-300">…</span> : value}
        </div>
      </div>
    </div>
  );
}
