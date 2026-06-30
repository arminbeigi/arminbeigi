'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bot, Send, Sparkles, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';

interface Msg {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'چند مشتری داریم؟',
  'معاملات باز چقدره؟',
  'امروز چند تماس داشتیم؟',
  'چند پروژه در حال اجراست؟',
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'سلام! من دستیار هوشمند شفازح هستم. درباره‌ی مشتریان، فروش، تماس‌ها و پروژه‌ها از من بپرسید.' },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (query: string) => api.post<{ answer: string }>('/ai/assistant', { query }),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    },
    onError: () => setMessages((m) => [...m, { role: 'assistant', text: 'متأسفم، در پاسخ‌گویی خطایی رخ داد.' }]),
  });

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setInput('');
    ask.mutate(q);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-flame-600 text-white">
          <Sparkles size={18} />
        </span>
        <div>
          <div className="font-bold text-steel-900">دستیار هوشمند</div>
          <div className="text-xs text-steel-400">پرسش زبان طبیعی روی داده‌های CRM</div>
        </div>
      </div>

      <div ref={scrollRef} className="card flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={clsx('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : '')}>
            <span
              className={clsx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full',
                m.role === 'user' ? 'bg-steel-700 text-white' : 'bg-flame-100 text-flame-600',
              )}
            >
              {m.role === 'user' ? <UserIcon size={15} /> : <Bot size={15} />}
            </span>
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-7',
                m.role === 'user' ? 'bg-steel-700 text-white' : 'bg-steel-100 text-steel-800',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {ask.isPending && (
          <div className="flex gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-flame-100 text-flame-600">
              <Bot size={15} />
            </span>
            <div className="rounded-2xl bg-steel-100 px-4 py-2 text-sm text-steel-400">در حال فکر کردن…</div>
          </div>
        )}
      </div>

      {/* پیشنهادها */}
      <div className="my-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="badge cursor-pointer border border-steel-200 bg-white px-3 py-1.5 text-steel-600 hover:bg-steel-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="پرسش خود را بنویسید…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-accent" disabled={!input.trim() || ask.isPending}>
          <Send size={18} /> ارسال
        </button>
      </form>
    </div>
  );
}
