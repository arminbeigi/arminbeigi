import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Call, Customer, User } from '@prisma/client';

type CallWithRelations = Call & {
  customer?: Pick<Customer, 'id' | 'displayName' | 'type' | 'status' | 'leadScore'> | null;
  agent?: Pick<User, 'id' | 'fullName'> | null;
};

export class CallResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() uniqueId: string;
  @ApiProperty() direction: string;
  @ApiProperty() status: string;
  @ApiProperty() fromNumber: string;
  @ApiProperty() toNumber: string;
  @ApiPropertyOptional() did: string | null;
  @ApiPropertyOptional() queue: string | null;
  @ApiPropertyOptional() agentId: string | null;
  @ApiPropertyOptional() agentName: string | null;
  @ApiPropertyOptional() customerId: string | null;
  @ApiPropertyOptional() customerName: string | null;
  @ApiPropertyOptional() customerType: string | null;
  @ApiPropertyOptional() customerStatus: string | null;
  @ApiPropertyOptional() dealId: string | null;
  @ApiPropertyOptional() ticketId: string | null;
  @ApiPropertyOptional() waitSeconds: number | null;
  @ApiPropertyOptional() talkSeconds: number | null;
  @ApiProperty() startedAt: Date;
  @ApiPropertyOptional() answeredAt: Date | null;
  @ApiPropertyOptional() endedAt: Date | null;
  @ApiPropertyOptional() recordingUrl: string | null;
  @ApiPropertyOptional() transcript: string | null;
  @ApiProperty() intent: string;

  static from(c: CallWithRelations): CallResponseDto {
    return {
      id: c.id,
      uniqueId: c.uniqueId,
      direction: c.direction,
      status: c.status,
      fromNumber: c.fromNumber,
      toNumber: c.toNumber,
      did: c.did,
      queue: c.queue,
      agentId: c.agentId,
      agentName: c.agent?.fullName ?? null,
      customerId: c.customerId,
      customerName: c.customer?.displayName ?? null,
      customerType: c.customer?.type ?? null,
      customerStatus: c.customer?.status ?? null,
      dealId: c.dealId,
      ticketId: c.ticketId,
      waitSeconds: c.waitSeconds,
      talkSeconds: c.talkSeconds,
      startedAt: c.startedAt,
      answeredAt: c.answeredAt,
      endedAt: c.endedAt,
      recordingUrl: c.recordingUrl,
      transcript: c.transcript,
      intent: c.intent,
    };
  }
}
