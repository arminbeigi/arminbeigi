// نگاشت وضعیت/جهت تماس به رنگ نشان

export const CALL_STATUS_TONE: Record<string, string> = {
  RINGING: 'bg-amber-100 text-amber-700',
  ANSWERED: 'bg-emerald-100 text-emerald-700',
  NO_ANSWER: 'bg-red-100 text-red-700',
  BUSY: 'bg-orange-100 text-orange-700',
  FAILED: 'bg-red-100 text-red-700',
  VOICEMAIL: 'bg-steel-100 text-steel-600',
};

export const isActiveCall = (status: string): boolean => status === 'RINGING';
