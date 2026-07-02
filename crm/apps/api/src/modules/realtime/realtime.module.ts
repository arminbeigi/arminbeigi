import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TelephonyModule } from '../telephony/telephony.module';
import { UsersModule } from '../users/users.module';
import { RealtimeEventsListener } from './realtime-events.listener';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [JwtModule.register({}), UsersModule, TelephonyModule],
  providers: [RealtimeGateway, RealtimeEventsListener],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
