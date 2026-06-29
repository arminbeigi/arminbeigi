import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** سراسری تا هر ماژولی بدون import مجدد به PrismaService دسترسی داشته باشد */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
