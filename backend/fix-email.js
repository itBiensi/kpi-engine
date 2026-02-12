const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixEmail() {
    try {
        const updated = await prisma.user.update({
            where: { email: 'jhon.doe@abc.com' },
            data: { email: 'john.doe@abc.com' },
        });
        console.log('✓ Email updated successfully:', updated);
    } catch (error) {
        console.error('✗ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

fixEmail();
