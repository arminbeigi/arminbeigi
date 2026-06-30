import { Logger } from '@nestjs/common';
import { CallDirection } from '@prisma/client';
import { createConnection, Socket } from 'net';
import { randomUUID } from 'crypto';
import {
  CallSignal,
  IAmiClient,
  OriginateParams,
  OriginateResult,
} from './ami-client.interface';

export interface RealAmiOptions {
  host: string;
  port: number;
  username: string;
  secret: string;
  /** کانتکست‌هایی که تماس ورودی محسوب می‌شوند (وابسته به dialplan؛ هنگام راه‌اندازی تنظیم شود) */
  inboundContexts?: string[];
  outboundContext?: string;
}

type AmiPacket = Record<string, string>;

interface ChannelState {
  direction: CallDirection;
  fromNumber: string;
  toNumber: string;
  did?: string;
  channel?: string;
  answeredAt?: number;
  recordingPath?: string;
  ringEmitted?: boolean;
}

/**
 * کلاینت واقعی AMI (Asterisk Manager Interface) روی TCP پورت ۵۰۳۸.
 * رویدادهای خام Asterisk را به CallSignal نرمال‌شده ترجمه می‌کند.
 *
 * نکته: نگاشت جهت/شماره از روی Context و CallerIDNum انجام می‌شود و وابسته به
 * dialplan شرکت است؛ مقادیر inboundContexts/outboundContext هنگام اتصال به
 * Issabel واقعی تنظیم می‌شوند. تا آن زمان از MockAmiClient استفاده می‌شود.
 */
export class RealAmiClient implements IAmiClient {
  private readonly logger = new Logger('RealAmiClient');
  private socket?: Socket;
  private buffer = '';
  private connected = false;
  private loggedIn = false;
  private handler?: (signal: CallSignal) => void | Promise<void>;
  private readonly channels = new Map<string, ChannelState>();
  private readonly inboundContexts: Set<string>;
  private readonly outboundContext: string;

  constructor(private readonly opts: RealAmiOptions) {
    this.inboundContexts = new Set(
      opts.inboundContexts ?? ['from-pstn', 'from-trunk', 'from-did-direct', 'from-external'],
    );
    this.outboundContext = opts.outboundContext ?? 'from-internal';
  }

  mode(): 'mock' | 'real' {
    return 'real';
  }

  isConnected(): boolean {
    return this.connected && this.loggedIn;
  }

  onSignal(handler: (signal: CallSignal) => void | Promise<void>): void {
    this.handler = handler;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: this.opts.host, port: this.opts.port }, () => {
        this.connected = true;
        this.send({
          Action: 'Login',
          Username: this.opts.username,
          Secret: this.opts.secret,
          Events: 'call,all',
        });
        this.logger.log(`اتصال AMI به ${this.opts.host}:${this.opts.port} برقرار شد`);
        resolve();
      });
      socket.setEncoding('utf8');
      socket.on('data', (chunk: string) => this.onData(chunk));
      socket.on('error', (err) => {
        this.logger.error(`خطای سوکت AMI: ${err.message}`);
        if (!this.connected) reject(err);
      });
      socket.on('close', () => {
        this.connected = false;
        this.loggedIn = false;
        this.logger.warn('اتصال AMI بسته شد؛ تلاش مجدد تا ۵ ثانیه دیگر');
        setTimeout(() => this.connect().catch(() => undefined), 5000);
      });
      this.socket = socket;
    });
  }

  disconnect(): Promise<void> {
    this.socket?.destroy();
    this.connected = false;
    this.loggedIn = false;
    return Promise.resolve();
  }

  async originate(params: OriginateParams): Promise<OriginateResult> {
    const actionId = randomUUID();
    this.send({
      Action: 'Originate',
      ActionID: actionId,
      Channel: `PJSIP/${params.agentExtension}`,
      Exten: params.toNumber,
      Context: this.outboundContext,
      Priority: '1',
      CallerID: params.callerId ?? params.toNumber,
      Async: 'true',
    });
    return { uniqueId: actionId, actionId };
  }

  // ── پروتکل ──────────────────────────────────────────────────────────────────
  private send(fields: AmiPacket): void {
    const data =
      Object.entries(fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n\r\n';
    this.socket?.write(data);
  }

  private onData(chunk: string): void {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf('\r\n\r\n')) !== -1) {
      const raw = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 4);
      this.handlePacket(this.parse(raw));
    }
  }

  private parse(raw: string): AmiPacket {
    const packet: AmiPacket = {};
    for (const line of raw.split('\r\n')) {
      const sep = line.indexOf(':');
      if (sep > 0) packet[line.slice(0, sep).trim()] = line.slice(sep + 1).trim();
    }
    return packet;
  }

  private handlePacket(p: AmiPacket): void {
    if (p.Response === 'Success' && !this.loggedIn) {
      this.loggedIn = true;
      this.logger.log('ورود به AMI موفق بود');
      return;
    }
    const signal = this.translate(p);
    if (signal && this.handler) void this.handler(signal);
  }

  /** ترجمه‌ی رویداد خام Asterisk → CallSignal (یا null اگر بی‌ربط) */
  private translate(p: AmiPacket): CallSignal | null {
    const uniqueId = p.Uniqueid || p.UniqueID;
    if (!uniqueId) return null;

    switch (p.Event) {
      case 'Newchannel': {
        const context = p.Context ?? '';
        const isInbound = this.inboundContexts.has(context);
        const direction = isInbound ? CallDirection.INBOUND : CallDirection.OUTBOUND;
        const state: ChannelState = {
          direction,
          fromNumber: p.CallerIDNum || p.ConnectedLineNum || '',
          toNumber: p.Exten || '',
          did: isInbound ? p.Exten : undefined,
          channel: p.Channel,
        };
        this.channels.set(uniqueId, state);
        if (!state.fromNumber || !state.toNumber) return null;
        state.ringEmitted = true;
        return { uniqueId, phase: 'RINGING', direction, fromNumber: state.fromNumber, toNumber: state.toNumber, did: state.did, channel: state.channel };
      }
      case 'VarSet': {
        // مسیر فایل ضبط (MixMonitor)
        if (p.Variable === 'MIXMONITOR_FILENAME' || p.Variable === 'RECORDING_FILE') {
          const st = this.channels.get(uniqueId);
          if (st) st.recordingPath = p.Value;
        }
        return null;
      }
      case 'Newstate': {
        if (p.ChannelStateDesc === 'Up') {
          const st = this.channels.get(uniqueId);
          if (!st) return null;
          st.answeredAt = Date.now();
          return { uniqueId, phase: 'ANSWERED', direction: st.direction, fromNumber: st.fromNumber, toNumber: st.toNumber, did: st.did, channel: st.channel };
        }
        return null;
      }
      case 'Hangup': {
        const st = this.channels.get(uniqueId);
        if (!st) return null;
        this.channels.delete(uniqueId);
        const talkSeconds = st.answeredAt ? Math.round((Date.now() - st.answeredAt) / 1000) : 0;
        return { uniqueId, phase: 'HANGUP', direction: st.direction, fromNumber: st.fromNumber, toNumber: st.toNumber, did: st.did, channel: st.channel, talkSeconds, recordingPath: st.recordingPath };
      }
      default:
        return null;
    }
  }
}
