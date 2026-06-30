'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Flame, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@shofazh.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-steel-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-flame-600">
            <Flame size={28} className="text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">شفازح CRM</h1>
            <p className="text-sm text-steel-400">ورود به سامانه مدیریت تأسیسات</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">ایمیل</label>
            <div className="relative">
              <Mail size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pr-9"
                placeholder="example@shofazh.com"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-steel-700">رمز عبور</label>
            <div className="relative">
              <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-9"
                placeholder="••••••••"
                dir="ltr"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : null}
            {loading ? 'در حال ورود…' : 'ورود'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-steel-500">© شفازح — همه حقوق محفوظ است</p>
      </div>
    </main>
  );
}
