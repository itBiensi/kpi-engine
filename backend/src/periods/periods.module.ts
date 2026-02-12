import { Module } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [PrismaModule, AuditLogModule],
    controllers: [PeriodsController],
    providers: [PeriodsService],
    exports: [PeriodsService],
})
export class PeriodsModule {}
