import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { UsersModule } from '../users/users.module';
import { CallsController } from './calls.controller';
import { CallsRepository } from './calls.repository';
import { CallsService } from './calls.service';

@Module({
  imports: [CustomersModule, UsersModule],
  controllers: [CallsController],
  providers: [CallsService, CallsRepository],
  exports: [CallsService],
})
export class CallsModule {}
