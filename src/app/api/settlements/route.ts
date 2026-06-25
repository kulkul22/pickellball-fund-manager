import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "Thiếu userId" },
      { status: 400 }
    );
  }

  const settlements = await db.settlement.findMany({
    where: {
      status: { not: "SETTLED" },
      OR: [
        { fromUserId: userId },
        { toUserId: userId },
      ],
    },
    include: {
      fromUser: { select: { id: true, name: true, zaloNickname: true, role: true } },
      toUser: { select: { id: true, name: true, zaloNickname: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(settlements);
}

export async function POST(req: NextRequest) {
  // Thuật toán Debt Simplification
  const users = await db.user.findMany({
    where: { balance: { not: 0 } },
  });

  if (users.length === 0) {
    return NextResponse.json({ message: "Không có khoản nợ nào cần thanh toán", settlements: [] });
  }

  // Tách debtors (balance < 0) và creditors (balance > 0)
  const debtors = users.filter((u) => u.balance < 0).map((u) => ({
    id: u.id,
    amount: Math.abs(u.balance),
  }));
  const creditors = users.filter((u) => u.balance > 0).map((u) => ({
    id: u.id,
    amount: u.balance,
  }));

  // Greedy matching
  const transactions: { fromId: string; toId: string; amount: number }[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Lấy debtor và creditor có amount lớn nhất
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

  if (transactions.length === 0) {
    return NextResponse.json({ message: "Không tạo được settlement nào", settlements: [] });
  }

  // Tạo Settlement records trong transaction
  const settlements = await db.$transaction(async (tx) => {
    const created = [];

    for (const t of transactions) {
      const settlement = await tx.settlement.create({
        data: {
          fromUserId: t.fromId,
          toUserId: t.toId,
          amount: t.amount,
          status: "PENDING",
        },
        include: {
          fromUser: { select: { name: true, zaloNickname: true } },
          toUser: { select: { name: true, zaloNickname: true } },
        },
      });
      created.push(settlement);
    }

    // Reset balance tất cả user về 0
    for (const user of users) {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: 0 },
      });
    }

    return created;
  });

  return NextResponse.json(
    { message: `Đã tạo ${settlements.length} khoản thanh toán`, settlements },
    { status: 201 }
  );
}