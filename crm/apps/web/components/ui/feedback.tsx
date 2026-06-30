import { Inbox, LoaderCircle } from 'lucide-react';

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle size={20} className={`animate-spin text-steel-400 ${className ?? ''}`} />;
}

export function Loading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-steel-400">
      <Spinner /> {label}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center gap-2 p-12 text-center">
      <Inbox size={36} className="text-steel-300" />
      <div className="font-medium text-steel-600">{title}</div>
      {hint && <div className="text-sm text-steel-400">{hint}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="m-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}
