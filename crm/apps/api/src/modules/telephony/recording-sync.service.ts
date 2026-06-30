import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { basename } from 'path';
import { Env } from '../../config/env.validation';

/**
 * همگام‌سازی فایل ضبط مکالمه. مسیر فایل روی سرور Asterisk را به یک آدرس عمومی نگاشت می‌کند.
 * پیاده‌سازی فعلی فقط نگاشت مسیر است؛ هنگام اتصال واقعی، اینجا کپی/آپلود فایل اضافه می‌شود
 * (از AMI_RECORDING_DIR به ذخیره‌سازی نهایی).
 */
@Injectable()
export class RecordingSyncService {
  private readonly publicBase: string;

  constructor(config: ConfigService<Env, true>) {
    this.publicBase = config.get('RECORDING_PUBLIC_BASE', { infer: true });
  }

  /** مسیر فایل ضبط → آدرس عمومی همگام‌شده */
  sync(recordingPath: string): string {
    return `${this.publicBase}/${basename(recordingPath)}`;
  }
}
