import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const users = await db.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, username: true, name: true, role: true, balance: true },
  });
  return NextResponse.json(users);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, role, balance } = body;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Không tìm thấy user" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (balance !== undefined) updateData.balance = balance;

  const updated = await db.user.update({
    where: { id },
    data: updateData,
    select: { id: true, username: true, name: true, role: true, balance: true },
  });

  return NextResponse.json(updated);
}