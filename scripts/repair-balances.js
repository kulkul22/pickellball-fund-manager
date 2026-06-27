const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  await db.$transaction(async (tx) => {
    // 1. Reset ALL user balances to 0
    await tx.user.updateMany({ data: { balance: 0 } });
    console.log('Step 1: Reset all balances to 0');

    // 2. Fetch spouse users for redirect logic
    const spouseUsers = await tx.user.findMany({
      where: { username: { in: ['admin', 'yen'] } }
    });
    const adminUser = spouseUsers.find(u => u.username === 'admin');
    const yenUser = spouseUsers.find(u => u.username === 'yen');

    // 3. Get all sessions with participants
    const sessions = await tx.session.findMany({
      include: { participants: true },
      orderBy: { date: 'asc' },
    });
    console.log(`Step 2: Found ${sessions.length} sessions to replay`);

    // 4. Replay each session to recalculate balances
    for (const session of sessions) {
      const costPerPerson = Math.floor(session.totalCost / session.participants.length);
      const balanceChanges = {};

      // Payer gets credited
      balanceChanges[session.payerId] = (balanceChanges[session.payerId] ?? 0) + (session.totalCost - costPerPerson);

      // Non-payer participants get debited
      for (const p of session.participants) {
        if (p.userId !== session.payerId) {
          const targetUserId = (yenUser && p.userId === yenUser.id && adminUser) ? adminUser.id : p.userId;
          balanceChanges[targetUserId] = (balanceChanges[targetUserId] ?? 0) - costPerPerson;
        }
      }

      // Apply balance changes
      for (const [userId, change] of Object.entries(balanceChanges)) {
        if (change !== 0) {
          await tx.user.update({
            where: { id: userId },
            data: { balance: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) } },
          });
        }
      }

      console.log(`  Replayed session ${session.date.toISOString().slice(0,10)} | ${session.totalCost}đ | ${session.participants.length} participants`);
    }

    // 5. Verify balances
    const users = await tx.user.findMany({ orderBy: { name: 'asc' } });
    console.log('\nStep 3: Recalculated balances:');
    users.forEach(u => {
      if (u.balance !== 0) console.log(`  ${u.name}: ${u.balance}`);
    });

    // 6. Recalculate settlements
    // Delete all old PENDING settlements
    const deleted = await tx.settlement.deleteMany({ where: { status: 'PENDING' } });
    console.log(`\nStep 4: Deleted ${deleted.count} old PENDING settlements`);

    // Create new settlements from balances
    const debtors = users.filter(u => u.balance < 0).map(u => ({ id: u.id, name: u.name, amount: Math.abs(u.balance) }));
    const creditors = users.filter(u => u.balance > 0).map(u => ({ id: u.id, name: u.name, amount: u.balance }));

    const transactions = [];
    while (debtors.length > 0 && creditors.length > 0) {
      debtors.sort((a, b) => b.amount - a.amount);
      creditors.sort((a, b) => b.amount - a.amount);

      const debtor = debtors[0];
      const creditor = creditors[0];
      const amount = Math.min(debtor.amount, creditor.amount);

      transactions.push({ fromId: debtor.id, fromName: debtor.name, toId: creditor.id, toName: creditor.name, amount });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) debtors.shift();
      if (creditor.amount === 0) creditors.shift();
    }

    for (const t of transactions) {
      await tx.settlement.create({
        data: { fromUserId: t.fromId, toUserId: t.toId, amount: t.amount, status: 'PENDING' },
      });
    }

    console.log(`\nStep 5: Created ${transactions.length} new PENDING settlements:`);
    transactions.forEach(t => {
      console.log(`  ${t.fromName} → ${t.toName}: ${t.amount}đ`);
    });

    console.log('\n✅ Data repair complete!');
  }, { maxWait: 15000, timeout: 30000 });
}

main().catch(console.error).finally(() => db.$disconnect());
