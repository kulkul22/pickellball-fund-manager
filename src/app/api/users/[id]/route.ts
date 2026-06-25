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

  await db.user.delete({ where: { id } });

  return NextResponse.json({ message: "Đã xóa người dùng" });
}