import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { KpiExportProcessor } from './kpi-export.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'kpi-export',
        }),
        PrismaModule,
        AuditLogModule,
    ],
    controllers: [ReportsController],
    providers: [ReportsService, KpiExportProcessor],
    exports: [ReportsService],
})
export class ReportsModule {}
