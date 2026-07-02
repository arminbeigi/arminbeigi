import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../../common/types/auth-user';
import { Env } from '../../config/env.validation';
import { UsersService } from '../users/users.service';
import { CrmPopup, TelephonyEvents } from '../telephony/telephony.events';

/**
 * دروازه‌ی Realtime (Socket.IO). با JWT روی هندشیک احراز هویت می‌کند، کاربر را در اتاق‌های
 * user:<id> و role:<key> می‌گذارد، و رویداد پاپ‌آپ تماس (از TelephonyEvents فاز ۴) را به
 * اپراتور مربوطه می‌فرستد. در تک‌نمونه با آداپتور حافظه؛ برای مقیاس‌پذیری آداپتور Redis افزوده می‌شود.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger('Realtime');
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly users: UsersService,
    private readonly telephonyEvents: TelephonyEvents,
  ) {}

  onModuleInit(): void {
    // اتصال ناقل پاپ‌آپ تلفنی به وب‌سوکت
    this.telephonyEvents.onPopup((payload) => this.handlePopup(payload));
  }

  handleConnection(client: Socket): void {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify<AuthUser>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      client.data.user = payload;
      void client.join(`user:${payload.sub}`);
      for (const role of payload.roles ?? []) void client.join(`role:${role}`);
      this.logger.debug(`اتصال: ${payload.email}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as AuthUser | undefined;
    if (user) this.logger.debug(`قطع اتصال: ${user.email}`);
  }

  /** پاپ‌آپ تماس ورودی → اپراتور مربوطه (با داخلی) + همه‌ی اپراتورهای مرکز تماس */
  private async handlePopup(payload: CrmPopup): Promise<void> {
    if (!this.server) return;

    // مجموعه‌ی اتاق‌های مقصد (Socket.IO در یک emit، هر سوکت را فقط یک‌بار می‌گیرد)
    const rooms = ['role:call_center', 'role:admin'];
    if (payload.agentExtension) {
      const agent = await this.users.findByExtension(payload.agentExtension);
      if (agent) rooms.push(`user:${agent.id}`);
    }
    this.server.to(rooms).emit('call:incoming', payload);

    // به‌روزرسانی فید/داشبورد برای همه‌ی متصل‌ها
    this.server.emit('call:updated', { callId: payload.call.id });
  }

  /** ابزار عمومی برای انتشار رویداد به همه (استفاده‌ی ماژول‌های دیگر در آینده) */
  broadcast(event: string, data: unknown): void {
    this.server?.emit(event, data);
  }

  /**
   * انتشار رویداد تیکت به نقش‌های مرتبط با پشتیبانی + مسئول تیکت (در صورت وجود).
   * با آداپتور Redis (H4)، این رویداد بین همه‌ی اینستنس‌ها هم پخش می‌شود.
   */
  emitTicketEvent(
    event: 'ticket:created' | 'ticket:updated',
    data: { ticketId: string; [key: string]: unknown },
    assigneeId?: string | null,
  ): void {
    if (!this.server) return;
    const rooms = ['role:admin', 'role:technician', 'role:call_center', 'role:sales_manager'];
    if (assigneeId) rooms.push(`user:${assigneeId}`);
    this.server.to(rooms).emit(event, data);
  }

  /** ارسال رویداد به یک کاربر خاص (اتاق user:<id>) — برای اعلان‌های درون‌برنامه‌ای. */
  emitToUser(userId: string, event: string, data: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, data);
  }
}
