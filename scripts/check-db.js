const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  console.log('\n=== USERS & BALANCES ===');
  users.forEach(u => {
    console.log(`  ${u.name} (@${u.username}) [${u.id}]: balance = ${u.balance}`);
  });

  const sessions = await prisma.session.findMany({
    include: { payer: { select: { name: true } }, participants: { include: { user: { select: { name: true } } } } },
    orderBy: { date: 'desc' },
    take: 5,
  });
  console.log('\n=== RECENT SESSIONS (last 5) ===');
  sessions.forEach(s => {
    const participants = s.participants.map(p => p.user.name).join(', ');
    console.log(`  ${s.date.toISOString().slice(0,10)} | ${s.location} | ${s.totalCost}đ | Payer: ${s.payer.name} | Participants: [${participants}]`);
  });

  const settlements = await prisma.settlement.findMany({
    include: {
      fromUser: { select: { name: true, id: true } },
      toUser: { select: { name: true, id: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  console.log('\n=== ALL SETTLEMENTS ===');
  if (settlements.length === 0) {
    console.log('  (NO settlements in DB!)');
  }
  settlements.forEach(s => {
    console.log(`  [${s.status}] ${s.fromUser.name} (${s.fromUserId}) → ${s.toUser.name} (${s.toUserId}): ${s.amount}đ`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
