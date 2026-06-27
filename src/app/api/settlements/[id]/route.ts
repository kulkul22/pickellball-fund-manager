import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { recalculateSettlements } from "@/lib/settlement-helper";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, userRole } = body;

  const ids = id.split(',');
  const settlements = await db.settlement.findMany({
    where: { id: { in: ids } }
  });

  if (settlements.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy settlement" }, { status: 404 });
  }

  let newStatus: string | null = null;

  if (userRole === "ADMIN" && action === "ADMIN_FORCE") {
    newStatus = "SETTLED";
  } else if (action === "SEND") {
    const allPending = settlements.every(s => s.status === "PENDING");
    if (!allPending) {
      return NextResponse.json({ error: "Một số giao dịch không ở trạng thái chờ chuyển" }, { status: 400 });
    }
    newStatus = "SENT";
  } else if (action === "RECEIVE") {
    const allSent = settlements.every(s => s.status === "SENT");
    if (!allSent) {
      return NextResponse.json({ error: "Một số giao dịch không ở trạng thái đã chuyển" }, { status: 400 });
    }
    newStatus = "SETTLED";
  } else {
    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  }

  const updated = await db.$transaction(async (tx) => {
    // 1. Cập nhật trạng thái cho toàn bộ settlements
    await tx.settlement.updateMany({
      where: { id: { in: ids } },
      data: { status: newStatus! }
    });

    if (newStatus === "SETTLED") {
      for (const s of settlements) {
        // Người chuyển: số dư được tăng lên (bù lại số âm)
        await tx.user.update({
          where: { id: s.fromUserId },
          data: { balance: { increment: s.amount } },
        });

        // Người nhận: số dư được giảm xuống (giảm số tiền được nợ)
        await tx.user.update({
          where: { id: s.toUserId },
          data: { balance: { decrement: s.amount } },
        });
      }

      // Tính toán lại các giao dịch PENDING dựa trên số dư mới
      await recalculateSettlements(tx);
    }

    // Lấy danh sách kết quả đã được cập nhật
    const updatedList = await tx.settlement.findMany({
      where: { id: { in: ids } },
      include: {
        fromUser: { select: { id: true, name: true, role: true } },
        toUser: { select: { id: true, name: true, role: true } },
      }
    });

    return updatedList;
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return NextResponse.json(updated);
}