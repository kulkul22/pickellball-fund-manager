import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username } = body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đăng nhập" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Không tìm thấy người dùng" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    balance: user.balance,
  });
}