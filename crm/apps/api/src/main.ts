import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Env } from './config/env.validation';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix('api');

  // پشت Nginx/پراکسی هستیم: IP واقعی کاربر از X-Forwarded-For خوانده شود تا
  // محدودیت نرخ (throttler) به‌ازای هر کاربر درست عمل کند، نه یک سطل مشترک.
  app.set('trust proxy', 1);

  // آداپتور Socket.IO برای Realtime (فاز ۷)
  app.useWebSocketAdapter(new IoAdapter(app));

  // اعتبارسنجی سراسری ورودی‌ها
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // فیلدهای ناشناخته حذف می‌شوند
      forbidNonWhitelisted: true, // یا خطا می‌دهند
      transform: true, // تبدیل خودکار به نوع DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  const origins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({ origin: origins === '*' ? true : origins.split(','), credentials: true });

  // خاموشی تمیز Prisma
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  // مستندات Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('شفازح CRM API')
    .setDescription('API سیستم CRM و مرکز تماس شفازح')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 شفازح CRM API روی پورت ${port} اجرا شد — مستندات: /api/docs`);
}

void bootstrap();
