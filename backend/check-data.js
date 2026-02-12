const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('\n=== USERS ===');
        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                fullName: true,
                email: true,
                role: true,
            },
        });
        console.table(users);

        console.log('\n=== PERIODS ===');
        const periods = await prisma.period.findMany({
            select: {
                id: true,
                name: true,
                status: true,
                isActive: true,
                startDate: true,
                endDate: true,
            },
        });
        console.table(periods);

        console.log('\n=== KPI PLANS ===');
        const kpiPlans = await prisma.kpiHeader.findMany({
            select: {
                id: true,
                userId: true,
                periodId: true,
                status: true,
            },
            take: 10,
        });
        console.table(kpiPlans);

        // Check for john.doe@abc.com
        const johnDoe = await prisma.user.findUnique({
            where: { email: 'john.doe@abc.com' },
        });
        console.log('\n=== john.doe@abc.com USER ===');
        if (johnDoe) {
            console.log('✓ User exists:', johnDoe);
        } else {
            console.log('✗ User john.doe@abc.com NOT FOUND');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();
