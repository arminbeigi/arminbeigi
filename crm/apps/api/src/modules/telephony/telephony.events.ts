import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { CallResponseDto } from '../calls/dto/call-response.dto';

/** بار پاپ‌آپ CRM که هنگام تماس ورودی به اپراتور می‌رسد (مصرف در فاز ۷ — WebSocket) */
export interface CrmPopup {
  call: CallResponseDto;
  matched: boolean;
  leadCreated: boolean;
  agentExtension?: string;
}

/**
 * ناقل رویداد داخلی برای پاپ‌آپ تماس. در فاز ۷، Gateway وب‌سوکت روی onPopup مشترک
 * می‌شود و رویداد را به اپراتور مربوطه می‌فرستد. اکنون فقط لایه‌ی انتشار آماده است.
 */
@Injectable()
export class TelephonyEvents {
  private readonly emitter = new EventEmitter();

  onPopup(handler: (payload: CrmPopup) => void): void {
    this.emitter.on('popup', handler);
  }

  emitPopup(payload: CrmPopup): void {
    this.emitter.emit('popup', payload);
  }
}
