import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadProcessor } from './bulk-upload.processor';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'bulk-upload',
        }),
        AuthModule,
        PrismaModule,
        AuditLogModule,
    ],
    controllers: [BulkUploadController],
    providers: [BulkUploadService, BulkUploadProcessor],
})
export class BulkUploadModule { }
