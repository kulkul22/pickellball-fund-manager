import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { recalculateSettlements } from "@/lib/settlement-helper";

export const dynamic = 'force-dynamic';

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
      fromUser: { select: { id: true, name: true, zaloNickname: true, role: true, balance: true } },
      toUser: { select: { id: true, name: true, zaloNickname: true, role: true, balance: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const debtorIds = Array.from(new Set(settlements.map(s => s.fromUserId)));

  // Fetch sessions for all these debtors in a single query
  const sessions = await db.session.findMany({
    where: {
      participants: {
        some: {
          userId: { in: debtorIds }
        }
      }
    },
    include: {
      participants: true,
    },
    orderBy: {
      date: "desc"
    }
  });

  const settlementsWithDates = settlements.map(s => {
    const debtorId = s.fromUserId;
    const balance = s.fromUser.balance;

    let debtDates: string[] = [];

    if (balance < 0) {
      let remainingDebt = Math.abs(balance);
      const datesSet = new Set<string>();

      const debtSessions = sessions.filter(session =>
        session.payerId !== debtorId &&
        session.participants.some(p => p.userId === debtorId)
      );

      for (const session of debtSessions) {
        const costPerPerson = Math.floor(session.totalCost / session.participants.length);
        const dateStr = new Date(session.date).toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        datesSet.add(dateStr);
        remainingDebt -= costPerPerson;

        if (remainingDebt <= 0) {
          break;
        }
      }

      debtDates = Array.from(datesSet).reverse();
    }

    return {
      ...s,
      debtDates
    };
  });

  return NextResponse.json(settlementsWithDates);
}

export async function POST() {
  await db.$transaction(async (tx) => {
    await recalculateSettlements(tx);
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return NextResponse.json({ message: "Đã đồng bộ giao dịch thành công" });
}