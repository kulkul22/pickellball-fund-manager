import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { recalculateSettlements } from "@/lib/settlement-helper";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await db.session.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Không tìm thấy buổi đánh" }, { status: 404 });
  }

  const costPerPerson = Math.floor(session.totalCost / session.participants.length);

  const result = await db.$transaction(async (tx) => {
    // Tìm ID của Nguyên (admin) và Yến (yen) để điều hướng chi phí
    const spouseUsers = await tx.user.findMany({
      where: {
        username: { in: ['admin', 'yen'] }
      }
    });
    const adminUser = spouseUsers.find(u => u.username === 'admin');
    const yenUser = spouseUsers.find(u => u.username === 'yen');

    // Tính toán số dư cần hoàn trả
    const balanceChanges: Record<string, number> = {};

    // Hoàn trả cho người đã trả tiền (trừ lại số dư được cộng trước đó)
    balanceChanges[session.payerId] = (balanceChanges[session.payerId] ?? 0) - (session.totalCost - costPerPerson);

    // Hoàn trả cho các thành viên tham gia khác (cộng lại số dư bị trừ trước đó)
    for (const p of session.participants) {
      if (p.userId !== session.payerId) {
        const targetUserId = (yenUser && p.userId === yenUser.id && adminUser) ? adminUser.id : p.userId;
        balanceChanges[targetUserId] = (balanceChanges[targetUserId] ?? 0) + costPerPerson;
      }
    }

    // Cập nhật số dư người dùng
    for (const [userId, change] of Object.entries(balanceChanges)) {
      if (change !== 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) } },
        });
      }
    }

    // Xóa liên kết người tham gia
    await tx.sessionParticipant.deleteMany({
      where: { sessionId: id },
    });

    // Xóa buổi đánh
    await tx.session.delete({
      where: { id },
    });

    // Tự động tính toán lại các giao dịch PENDING
    await recalculateSettlements(tx);

    return { success: true };
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return NextResponse.json(result);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { date, location, totalCost, payerId, participantIds } = body;

  if (!date || !totalCost || !payerId || !participantIds?.length) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const oldSession = await db.session.findUnique({
    where: { id },
    include: { participants: true },
  });

  if (!oldSession) {
    return NextResponse.json({ error: "Không tìm thấy buổi đánh" }, { status: 404 });
  }

  const newCostPerPerson = Math.floor(totalCost / participantIds.length);

  const result = await db.$transaction(async (tx) => {
    // Tìm ID của Nguyên (admin) và Yến (yen)
    const spouseUsers = await tx.user.findMany({
      where: {
        username: { in: ['admin', 'yen'] }
      }
    });
    const adminUser = spouseUsers.find(u => u.username === 'admin');
    const yenUser = spouseUsers.find(u => u.username === 'yen');

    // 1. HOÀN TRẢ SỐ DƯ CŨ (REVERSE)
    const oldCostPerPerson = Math.floor(oldSession.totalCost / oldSession.participants.length);
    const oldBalanceChanges: Record<string, number> = {};

    oldBalanceChanges[oldSession.payerId] = (oldBalanceChanges[oldSession.payerId] ?? 0) - (oldSession.totalCost - oldCostPerPerson);
    for (const p of oldSession.participants) {
      if (p.userId !== oldSession.payerId) {
        const targetUserId = (yenUser && p.userId === yenUser.id && adminUser) ? adminUser.id : p.userId;
        oldBalanceChanges[targetUserId] = (oldBalanceChanges[targetUserId] ?? 0) + oldCostPerPerson;
      }
    }

    for (const [userId, change] of Object.entries(oldBalanceChanges)) {
      if (change !== 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) } },
        });
      }
    }

    // 2. XÓA NGƯỜI THAM GIA CŨ VÀ CẬP NHẬT BUỔI ĐÁNH
    await tx.sessionParticipant.deleteMany({ where: { sessionId: id } });

    const updatedSession = await tx.session.update({
      where: { id },
      data: {
        date: new Date(date),
        location,
        totalCost,
        payerId,
        participants: {
          create: participantIds.map((uId: string) => ({
            userId: uId,
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

    // 3. ÁP DỤNG SỐ DƯ MỚI (APPLY)
    const newBalanceChanges: Record<string, number> = {};
    newBalanceChanges[payerId] = (newBalanceChanges[payerId] ?? 0) + (totalCost - newCostPerPerson);

    for (const uId of participantIds) {
      if (uId !== payerId) {
        const targetUserId = (yenUser && uId === yenUser.id && adminUser) ? adminUser.id : uId;
        newBalanceChanges[targetUserId] = (newBalanceChanges[targetUserId] ?? 0) - newCostPerPerson;
      }
    }

    for (const [userId, change] of Object.entries(newBalanceChanges)) {
      if (change !== 0) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { [change > 0 ? 'increment' : 'decrement']: Math.abs(change) } },
        });
      }
    }

    // 4. TÍNH TOÁN LẠI CÁC GIAO DỊCH PENDING
    await recalculateSettlements(tx);

    return updatedSession;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return NextResponse.json(result);
}
