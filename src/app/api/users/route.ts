import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, username: true, name: true, zaloNickname: true, role: true, balance: true },
  });

  const getGroupKey = (p: { username: string; name: string }) => {
    if (p.username === 'admin' || p.username === 'yen') {
      return 'Nguyên & Yến';
    }
    if (p.username === 'loc' || p.username === 'myvan') {
      return 'Lộc & Vân';
    }
    return p.name;
  };

  const getSubOrder = (p: { username: string }) => {
    if (p.username === 'admin') return 1;
    if (p.username === 'yen') return 2;
    if (p.username === 'loc') return 1;
    if (p.username === 'myvan') return 2;
    return 0;
  };

  users.sort((a, b) => {
    const groupA = getGroupKey(a);
    const groupB = getGroupKey(b);
    const comp = groupA.localeCompare(groupB, 'vi');
    if (comp !== 0) return comp;
    return getSubOrder(a) - getSubOrder(b);
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, name, zaloNickname, role } = body;

  if (!username || !name || !username.trim() || !name.trim()) {
    return NextResponse.json(
      { error: "Vui lòng điền username và tên hiển thị" },
      { status: 400 }
    );
  }

  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 2) {
    return NextResponse.json(
      { error: "Username phải có ít nhất 2 ký tự" },
      { status: 400 }
    );
  }

  // Check duplicate username
  const existing = await db.user.findUnique({ where: { username: trimmed } });
  if (existing) {
    return NextResponse.json(
      { error: `Username "${trimmed}" đã tồn tại` },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: {
      username: trimmed,
      name: name.trim(),
      zaloNickname: zaloNickname?.trim() || "",
      role: role || "USER",
      balance: 0,
    },
    select: { id: true, username: true, name: true, zaloNickname: true, role: true, balance: true },
  });

  return NextResponse.json(user, { status: 201 });
}