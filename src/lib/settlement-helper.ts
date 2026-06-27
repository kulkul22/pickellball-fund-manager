import { Prisma } from "@prisma/client";

export async function recalculateSettlements(tx: Prisma.TransactionClient) {
  // 1. Lấy tất cả user có balance khác 0
  const users = await tx.user.findMany({
    where: { balance: { not: 0 } },
  });

  // 2. Tách debtors (balance < 0) và creditors (balance > 0)
  const debtors = users
    .filter((u) => u.balance < 0)
    .map((u) => ({
      id: u.id,
      amount: Math.abs(u.balance),
    }));
  const creditors = users
    .filter((u) => u.balance > 0)
    .map((u) => ({
      id: u.id,
      amount: u.balance,
    }));

  // 3. Thuật toán Debt Simplification (Greedy matching)
  const transactions: { fromId: string; toId: string; amount: number }[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Sắp xếp giảm dần theo số tiền để ghép cặp tối ưu
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const debtor = debtors[0];
    const creditor = creditors[0];
    const amount = Math.min(debtor.amount, creditor.amount);

    transactions.push({
      fromId: debtor.id,
      toId: creditor.id,
      amount,
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }

  // 4. Xóa toàn bộ Settlement PENDING cũ
  await tx.settlement.deleteMany({
    where: { status: "PENDING" },
  });

  // 5. Lấy ngày buổi đánh sớm nhất để gắn vào settlement
  const earliestSession = await tx.session.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const settlementDate = earliestSession?.date ?? new Date();

  // 6. Tạo các Settlement PENDING mới với ngày nợ = ngày buổi đánh sớm nhất
  for (const t of transactions) {
    await tx.settlement.create({
      data: {
        fromUserId: t.fromId,
        toUserId: t.toId,
        amount: t.amount,
        status: "PENDING",
        createdAt: settlementDate,
      },
    });
  }
}
