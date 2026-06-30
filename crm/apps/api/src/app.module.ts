import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { validateEnv } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CallsModule } from './modules/calls/calls.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DealsModule } from './modules/deals/deals.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ProductsModule,
    ProjectsModule,
    DealsModule,
    CallsModule,
    TelephonyModule,
  ],
  controllers: [HealthController],
  providers: [
    // ترتیب مهم است: ابتدا احراز هویت، سپس بررسی مجوز
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
