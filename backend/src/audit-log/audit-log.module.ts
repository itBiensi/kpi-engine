import { Module } from '@nestjs/common';
import { AuditService } from './audit-log.service';
import { AuditController } from './audit-log.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  controllers: [AuditController],
  exports: [AuditService], // Export for use in other modules
})
export class AuditLogModule {}
