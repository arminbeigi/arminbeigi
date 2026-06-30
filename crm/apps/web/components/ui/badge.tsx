import clsx from 'clsx';
import type { ReactNode } from 'react';

export function Badge({ tone, children }: { tone?: string; children: ReactNode }) {
  return <span className={clsx('badge', tone ?? 'bg-steel-100 text-steel-600')}>{children}</span>;
}
