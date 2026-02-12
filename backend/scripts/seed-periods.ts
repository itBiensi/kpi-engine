import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding periods for existing KPI data...');

  // Get all distinct periodIds from existing kpi_headers
  const existingPeriods = await prisma.$queryRaw<Array<{ period_id: number }>>`
    SELECT DISTINCT period_id FROM kpi_headers ORDER BY period_id
  `;

  console.log(`Found ${existingPeriods.length} existing period IDs:`, existingPeriods.map(p => p.period_id));

  // Create Period records for each existing periodId
  for (const { period_id } of existingPeriods) {
    // Parse periodId as YYYYMM format (e.g., 202602 = February 2026)
    const year = Math.floor(period_id / 100);
    const month = period_id % 100;

    const startDate = new Date(year, month - 1, 1); // First day of month
    const endDate = new Date(year, month, 0); // Last day of month

    const periodName = `Period ${month.toString().padStart(2, '0')}/${year}`;

    try {
      await prisma.period.create({
        data: {
          id: period_id,
          name: periodName,
          startDate,
          endDate,
          cycleType: 'MONTHLY',
          status: 'CLOSED', // Mark old periods as CLOSED
          isActive: false,
        },
      });
      console.log(`✓ Created period: ${periodName} (ID: ${period_id})`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⚠ Period ${period_id} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }

  console.log('✅ Period seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding periods:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
