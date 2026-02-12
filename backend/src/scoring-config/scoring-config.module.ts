import { Module } from '@nestjs/common';
import { ScoringConfigService } from './scoring-config.service';
import { ScoringConfigController } from './scoring-config.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [ScoringConfigController],
  providers: [ScoringConfigService],
  exports: [ScoringConfigService],
})
export class ScoringConfigModule {}
