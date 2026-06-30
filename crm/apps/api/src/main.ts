import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { Env } from './config/env.validation';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  // bodyParser پیش‌فرض غیرفعال است تا parserهای خودمان با محدودیت حجم مشخص اعمال شوند.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
    bodyParser: false,
  });
  const config = app.get(ConfigService<Env, true>);
  const isProd = config.get('NODE_ENV', { infer: true }) === 'production';

  app.setGlobalPrefix('api');

  // پشت Nginx/پراکسی هستیم: IP واقعی کاربر از X-Forwarded-For خوانده شود تا
  // محدودیت نرخ (throttler) به‌ازای هر کاربر درست عمل کند، نه یک سطل مشترک.
  app.set('trust proxy', 1);

  // هدرهای امنیتی HTTP (helmet). CSP پیش‌فرض helmet با Swagger UI ناسازگار است؛
  // چون API و فرانت هم‌مبدأ پشت Nginx سرو می‌شوند، CSP در این لایه غیرفعال است
  // (هدرهای امنیتی صفحه در لایه‌ی فرانت/Nginx اعمال می‌شوند).
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // محدودیت حجم بدنه‌ی درخواست (دفاع در برابر payload بزرگ/DoS)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

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

  // CORS — در تولید، wildcard همراه credentials امن نیست. اگر CORS_ORIGINS='*' بماند،
  // در تولید credentials خاموش می‌شود (هم‌مبدأ پشت Nginx نیازی به credentials cross-origin ندارد).
  const origins = config.get('CORS_ORIGINS', { infer: true });
  if (origins === '*') {
    app.enableCors({ origin: true, credentials: !isProd });
    if (isProd) {
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️  CORS_ORIGINS=* در تولید: credentials غیرفعال شد. برای cross-origin با credentials، دامنه‌های مجاز را صریح تعیین کنید.',
      );
    }
  } else {
    app.enableCors({ origin: origins.split(','), credentials: true });
  }

  // خاموشی تمیز Prisma
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  // مستندات Swagger — به‌صورت پیش‌فرض در تولید غیرفعال (مگر SWAGGER_ENABLED=true)
  if (!isProd || process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('شفازح CRM API')
      .setDescription('API سیستم CRM و مرکز تماس شفازح')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  const docsNote = !isProd || process.env.SWAGGER_ENABLED === 'true' ? ' — مستندات: /api/docs' : '';
  // eslint-disable-next-line no-console
  console.log(`🚀 شفازح CRM API روی پورت ${port} اجرا شد${docsNote}`);
}

void bootstrap();
