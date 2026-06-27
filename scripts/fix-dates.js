const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  const s = await db.session.findFirst({ orderBy: { date: 'asc' }, select: { date: true } });
  if (s) {
    const r = await db.settlement.updateMany({ where: { status: 'PENDING' }, data: { createdAt: s.date } });
    console.log('Updated', r.count, 'settlements to date:', s.date.toISOString().slice(0, 10));
  }
}

main().catch(console.error).finally(() => db.$disconnect());
