import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

const configService = new ConfigService();

export const kpiExportQueue = new Queue('kpi-export', {
    connection: {
        host: configService.get('REDIS_HOST') || 'localhost',
        port: configService.get('REDIS_PORT') || 6379,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: false, // Keep for 7 days
        removeOnFail: false,
    },
});
