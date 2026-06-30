import { Construction } from 'lucide-react';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="card grid place-items-center gap-3 p-16 text-center">
      <Construction size={40} className="text-steel-300" />
      <div className="text-lg font-bold text-steel-700">{title}</div>
      <p className="max-w-sm text-sm text-steel-400">
        این بخش در واحدهای بعدی فاز ۵ ساخته می‌شود. ساختار، احراز هویت و دسترسی‌ها از قبل آماده‌اند.
      </p>
    </div>
  );
}
