import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { recalculateSettlements } from "@/lib/settlement-helper";

export const dynamic = 'force-dynamic';

export async function GET() {
  const sessions = await db.session.findMany({
    include: {
      payer: { select: { id: true, name: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, location, totalCost, payerId, participantIds } = body;

  if (!date || !location || !totalCost || !payerId || !participantIds?.length) {
    return NextResponse.json(
      { error: "Thiếu thông tin bắt buộc" },
      { status: 400 }
    );
  }

  const costPerPerson = Math.floor(totalCost / participantIds.length);

  try {
    const result = await db.$transaction(async (tx) => {
      // Tạo session
      const session = await tx.session.create({
        data: {
          date: new Date(date),
          location,
          totalCost,
          payerId,
          participants: {
            create: participantIds.map((userId: string) => ({
              userId,
            })),
          },
        },
        include: {
          payer: { select: { name: true } },
          participants: {
            include: { user: { select: { name: true } } },
          },
        },
      });

      // Tìm ID của Nguyên (admin) và Yến (yen) để điều hướng chi phí
      const spouseUsers = await tx.user.findMany({
        where: {
          username: { in: ['admin', 'yen'] }
        }
      });
      const adminUser = spouseUsers.find(u => u.username === 'admin');
      const yenUser = spouseUsers.find(u => u.username === 'yen');

      // Tính toán thay đổi balance của từng người
      const balanceChanges: Record<string, number> = {};

      // Khởi tạo thay đổi cho người trả tiền
      balanceChanges[payerId] = (balanceChanges[payerId] ?? 0) + (totalCost - costPerPerson);

      // Tính toán cho từng participant khác người trả tiền
      for (const userId of participantIds) {
        if (userId !== payerId) {
          // Nếu là Yến, phí sẽ tính cho Nguyên (admin)
          const targetUserId = (yenUser && userId === yenUser.id && adminUser) ? adminUser.id : userId;
          balanceChanges[targetUserId] = (balanceChanges[targetUserId] ?? 0) - costPerPerson;
        }
      }

      // Thực hiện cập nhật balance một lần duy nhất cho mỗi user có thay đổi
      for (const [userId, change] of Object.entries(balanceChanges)) {
        if (change !== 0) {
          await tx.user.update({
            where: { id: userId },
            data: { balance: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) } },
          });
        }
      }

      // Tự động tính toán lại các giao dịch chờ xử lý theo thời gian thực
      await recalculateSettlements(tx);

      return session;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/sessions error:", error);
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}