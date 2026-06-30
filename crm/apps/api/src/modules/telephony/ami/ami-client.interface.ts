import { CallDirection } from '@prisma/client';

/** توکن تزریق وابستگی برای کلاینت AMI (Mock یا Real) */
export const AMI_CLIENT = Symbol('AMI_CLIENT');

/**
 * سیگنال تماسِ نرمال‌شده. کلاینت AMI مسئول ترجمه‌ی رویدادهای خام Asterisk
 * (Newchannel/DialBegin/Newstate/Hangup) به این شکل است؛ بقیه‌ی سیستم فقط با این کار می‌کند.
 * با این لایه، تعویض Mock ↔ Real بدون تغییر منطق CRM ممکن است.
 */
export interface CallSignal {
  uniqueId: string;
  phase: 'RINGING' | 'ANSWERED' | 'HANGUP';
  direction: CallDirection;
  fromNumber: string;
  toNumber: string;
  agentExtension?: string;
  did?: string;
  queue?: string;
  channel?: string;
  linkedId?: string;
  talkSeconds?: number;
  recordingPath?: string;
}

export interface OriginateParams {
  agentExtension: string;
  toNumber: string;
  callerId?: string;
}

export interface OriginateResult {
  uniqueId: string;
  actionId: string;
}

/** قرارداد مشترک کلاینت AMI */
export interface IAmiClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  mode(): 'mock' | 'real';

  /** ثبت شنونده‌ی سیگنال تماس (رویدادهای نرمال‌شده) */
  onSignal(handler: (signal: CallSignal) => void): void;

  /** شروع تماس خروجی (click-to-call) */
  originate(params: OriginateParams): Promise<OriginateResult>;
}
