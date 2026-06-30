import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CallStatus } from '@prisma/client';
import { CallIngestResult, CallsService } from '../calls/calls.service';
import { CallResponseDto } from '../calls/dto/call-response.dto';
import { IngestCallDto } from '../calls/dto/ingest-call.dto';
import { AMI_CLIENT, CallSignal, IAmiClient, OriginateResult } from './ami/ami-client.interface';
import { MockAmiClient } from './ami/mock-ami.client';
import { OriginateDto } from './dto/originate.dto';
import { SimulateInboundDto } from './dto/simulate-inbound.dto';
import { RecordingSyncService } from './recording-sync.service';
import { TelephonyEvents } from './telephony.events';

@Injectable()
export class TelephonyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Telephony');

  constructor(
    @Inject(AMI_CLIENT) private readonly ami: IAmiClient,
    private readonly calls: CallsService,
    private readonly events: TelephonyEvents,
    private readonly recordings: RecordingSyncService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.ami.onSignal((signal) => this.handleSignal(signal));
    try {
      await this.ami.connect();
    } catch (e) {
      this.logger.error(`اتصال اولیه‌ی AMI ناموفق بود: ${(e as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.ami.disconnect();
  }

  status(): { mode: 'mock' | 'real'; connected: boolean } {
    return { mode: this.ami.mode(), connected: this.ami.isConnected() };
  }

  /** تماس خروجی (click-to-call) */
  async originate(dto: OriginateDto): Promise<OriginateResult> {
    if (!this.ami.isConnected()) throw new BadRequestException('اتصال تلفنی برقرار نیست');
    return this.ami.originate({
      agentExtension: dto.agentExtension,
      toNumber: dto.toNumber,
      callerId: dto.callerId,
    });
  }

  /** شبیه‌سازی تماس ورودی (فقط Mock) */
  async simulateInbound(dto: SimulateInboundDto): Promise<CallResponseDto | null> {
    if (!(this.ami instanceof MockAmiClient)) {
      throw new BadRequestException('شبیه‌سازی فقط در حالت Mock امکان‌پذیر است');
    }
    const uniqueId = await this.ami.simulateInbound(dto);
    return this.calls.findByUniqueId(uniqueId);
  }

  /**
   * هسته‌ی نگاشت: سیگنال نرمال‌شده‌ی AMI → CallsService.ingest.
   * در تماس ورودیِ زنگ‌خورده، پاپ‌آپ CRM را برای فاز ۷ منتشر می‌کند.
   */
  private async handleSignal(signal: CallSignal): Promise<CallIngestResult> {
    const dto = this.toIngestDto(signal);
    const result = await this.calls.ingest(dto);

    if (signal.phase === 'RINGING' && signal.direction === 'INBOUND') {
      this.events.emitPopup({
        call: result.call,
        matched: result.matched,
        leadCreated: result.leadCreated,
        agentExtension: signal.agentExtension,
      });
    }
    return result;
  }

  private toIngestDto(signal: CallSignal): IngestCallDto {
    const now = new Date().toISOString();
    const dto: IngestCallDto = {
      uniqueId: signal.uniqueId,
      direction: signal.direction,
      fromNumber: signal.fromNumber,
      toNumber: signal.toNumber,
      did: signal.did,
      queue: signal.queue,
      channel: signal.channel,
      linkedId: signal.linkedId,
      agentExtension: signal.agentExtension,
    };

    if (signal.phase === 'RINGING') {
      dto.status = CallStatus.RINGING;
      dto.startedAt = now;
    } else if (signal.phase === 'ANSWERED') {
      dto.status = CallStatus.ANSWERED;
      dto.answeredAt = now;
    } else {
      // HANGUP
      dto.status = (signal.talkSeconds ?? 0) > 0 ? CallStatus.ANSWERED : CallStatus.NO_ANSWER;
      dto.endedAt = now;
      dto.talkSeconds = signal.talkSeconds;
      if (signal.recordingPath) {
        dto.recordingPath = signal.recordingPath;
        dto.recordingUrl = this.recordings.sync(signal.recordingPath);
      }
    }
    return dto;
  }
}
