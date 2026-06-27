import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, zaloNickname, role, balance } = body;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (zaloNickname !== undefined) updateData.zaloNickname = zaloNickname;
  if (role !== undefined) updateData.role = role;
  if (balance !== undefined) updateData.balance = balance;

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, zaloNickname: true, role: true, balance: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  }

  // Cannot delete admin users (safety)
  if (existing.role === "ADMIN") {
    return NextResponse.json({ error: "Không thể xóa tài khoản Admin" }, { status: 400 });
  }

  // Xóa tất cả dữ liệu liên quan trong transaction để tránh lỗi foreign key
  await db.$transaction(async (tx) => {
    // 1. Xóa participations của user
    await tx.sessionParticipant.deleteMany({ where: { userId: id } });

    // 2. Xóa settlements liên quan (cả gửi và nhận)
    await tx.settlement.deleteMany({
      where: { OR: [{ fromUserId: id }, { toUserId: id }] },
    });

    // 3. Xóa sessions mà user là người trả tiền (payer)
    //    (trước tiên xóa participants của các session đó)
    const payerSessions = await tx.session.findMany({ where: { payerId: id }, select: { id: true } });
    if (payerSessions.length > 0) {
      const sessionIds = payerSessions.map((s) => s.id);
      await tx.sessionParticipant.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await tx.session.deleteMany({ where: { payerId: id } });
    }

    // 4. Xóa user
    await tx.user.delete({ where: { id } });
  }, {
    maxWait: 15000,
    timeout: 30000,
  });

  return NextResponse.json({ message: "Đã xóa người dùng" });
}