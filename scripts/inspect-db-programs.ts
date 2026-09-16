import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const programs = await prisma.programKerja.findMany({
    include: { months: { orderBy: [{ month: 'asc' }, { week: 'asc' }] } },
    orderBy: [{ category: 'asc' }, { sequence: 'asc' }],
  });

  console.log(`Total programs: ${programs.length}`);
  for (const p of programs) {
    const plannedMonths: number[] = [];
    const realizedMonths: { month: number; week: number; val: number }[] = [];
    for (const m of p.months) {
      if (m.target !== null) plannedMonths.push(m.month);
      if (m.realization !== null) realizedMonths.push({ month: m.month, week: m.week, val: m.realization });
    }
    const uniquePlanned = Array.from(new Set(plannedMonths));
    console.log(`[${p.category}] #${p.sequence} ${p.name} | Status: ${p.status} | Progress: ${p.progress}%`);
    console.log(`  Planned months (${uniquePlanned.length}): ${uniquePlanned.join(', ')}`);
    console.log(`  Realized entries (${realizedMonths.length}): ${realizedMonths.map(r => `M${r.month}W${r.week}=${r.val}`).join(', ') || 'NONE'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
