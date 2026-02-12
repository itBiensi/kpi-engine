import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { KpiModule } from './kpi/kpi.module';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module';
import { PeriodsModule } from './periods/periods.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ScoringConfigModule } from './scoring-config/scoring-config.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    AuthModule,
    UsersModule,
    KpiModule,
    BulkUploadModule,
    PeriodsModule,
    ReportsModule,
    AuditLogModule,
    ScoringConfigModule,
  ],
})
export class AppModule { }
