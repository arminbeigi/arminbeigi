import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';

/**
 * آداپتور Socket.IO با پشتیبانی Redis برای مقیاس‌پذیری چنداینستنسی.
 * اگر Redis در دسترس باشد، رویدادها بین همه‌ی اینستنس‌ها از طریق Redis pub/sub پخش می‌شوند
 * (پاپ‌آپ تماس به هر اپراتور می‌رسد، فارغ از اینکه به کدام اینستنس وصل است).
 * در نبود Redis، به آداپتور حافظه‌ی پیش‌فرض (تک‌اینستنس) برمی‌گردد.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  /** اتصال به Redis با کلاینت pub و یک کلاینت sub جدا (duplicate). */
  connectToRedis(client: Redis): void {
    const pubClient = client;
    const subClient = client.duplicate();
    subClient.on('error', (err) => this.logger.warn(`خطای Redis (sub): ${err.message}`));
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('آداپتور Redis برای Socket.IO فعال شد (مقیاس‌پذیری چنداینستنسی)');
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
