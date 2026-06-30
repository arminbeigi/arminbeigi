import { Logger } from '@nestjs/common';
import { CallDirection } from '@prisma/client';
import {
  CallSignal,
  IAmiClient,
  OriginateParams,
  OriginateResult,
} from './ami-client.interface';

export interface SimulateInboundOptions {
  fromNumber: string;
  did?: string;
  queue?: string;
  agentExtension?: string;
  answer?: boolean; // پاسخ داده شود؟
  talkSeconds?: number; // در صورت پاسخ، مدت مکالمه پیش از قطع
  recordingPath?: string;
}

/**
 * کلاینت AMI شبیه‌سازی‌شده. رویدادهای تماس را به‌صورت سیگنال نرمال‌شده تولید می‌کند
 * تا کل خط لوله (listener → CallsService.ingest → popup) بدون Issabel واقعی قابل‌اجرا و آزمون باشد.
 * هنگام راه‌اندازی Issabel، فقط با RealAmiClient جایگزین می‌شود.
 */
export class MockAmiClient implements IAmiClient {
  private readonly logger = new Logger('MockAmiClient');
  private handler?: (signal: CallSignal) => void | Promise<void>;
  private connected = false;
  private seq = 0;

  connect(): Promise<void> {
    this.connected = true;
    this.logger.log('کلاینت AMI شبیه‌سازی‌شده متصل شد (حالت Mock)');
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  isConnected(): boolean {
    return this.connected;
  }

  mode(): 'mock' | 'real' {
    return 'mock';
  }

  onSignal(handler: (signal: CallSignal) => void | Promise<void>): void {
    this.handler = handler;
  }

  newUniqueId(): string {
    return `${Math.floor(Date.now() / 1000)}.${this.seq++}`;
  }

  private async emit(signal: CallSignal): Promise<void> {
    this.logger.debug(`سیگنال: ${signal.phase} ${signal.direction} ${signal.uniqueId}`);
    if (this.handler) await this.handler(signal);
  }

  // ── تماس خروجی (click-to-call) ──────────────────────────────────────────────
  async originate(params: OriginateParams): Promise<OriginateResult> {
    const uniqueId = this.newUniqueId();
    const base = {
      uniqueId,
      direction: CallDirection.OUTBOUND,
      fromNumber: params.agentExtension,
      toNumber: params.toNumber,
      agentExtension: params.agentExtension,
      channel: `PJSIP/${params.agentExtension}`,
    };
    await this.emit({ ...base, phase: 'RINGING' });
    await this.emit({ ...base, phase: 'ANSWERED' });
    return { uniqueId, actionId: `mock-${uniqueId}` };
  }

  // ── شبیه‌سازی تماس ورودی (فقط Mock) ─────────────────────────────────────────
  async simulateInbound(opts: SimulateInboundOptions): Promise<string> {
    const uniqueId = this.newUniqueId();
    const did = opts.did ?? '02191000000';
    const base = {
      uniqueId,
      direction: CallDirection.INBOUND,
      fromNumber: opts.fromNumber,
      toNumber: did,
      did,
      queue: opts.queue,
      agentExtension: opts.agentExtension,
      channel: `PJSIP/trunk-${uniqueId}`,
    };
    await this.emit({ ...base, phase: 'RINGING' });
    if (opts.answer) {
      await this.emit({ ...base, phase: 'ANSWERED' });
      await this.emit({
        ...base,
        phase: 'HANGUP',
        talkSeconds: opts.talkSeconds ?? 0,
        recordingPath: opts.recordingPath,
      });
    }
    return uniqueId;
  }
}
