import { Module } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ScoringConfigModule } from '../scoring-config/scoring-config.module';

@Module({
    imports: [UsersModule, PrismaModule, AuditLogModule, ScoringConfigModule],
    controllers: [KpiController],
    providers: [KpiService],
    exports: [KpiService],
})
export class KpiModule { }
