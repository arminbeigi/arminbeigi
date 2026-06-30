import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Env } from './config/env.validation';
import { buildLoggerParams } from './config/logger.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { AiModule } from './modules/ai/ai.module';
import { CallsModule } from './modules/calls/calls.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DealsModule } from './modules/deals/deals.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // لاگ ساخت‌یافته (pino) با correlation-id — سطح از LOG_LEVEL خوانده می‌شود
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildLoggerParams(config.get('LOG_LEVEL', { infer: true })),
    }),
    // محدودیت نرخ سراسری (ضد brute-force/سوءاستفاده): ۱۰۰ درخواست در دقیقه به‌ازای هر IP.
    // مسیرهای حساس (auth) سقف سخت‌گیرانه‌ترِ خود را با @Throttle تعریف می‌کنند.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    ProjectsModule,
    DealsModule,
    CallsModule,
    TelephonyModule,
    AiModule,
    RealtimeModule,
  ],
  controllers: [HealthController],
  providers: [
    // ترتیب مهم است: ابتدا محدودیت نرخ، سپس احراز هویت، سپس بررسی مجوز
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
