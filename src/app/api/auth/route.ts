import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đăng nhập" },
      { status: 400 }
    );
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    return NextResponse.json(
      { error: "Vui lòng nhập mật khẩu" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
      { status: 401 }
    );
  }

  if (user.password !== password) {
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không chính xác" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    id: user.id,
    username: user.username,
    name: user.name,
    zaloNickname: user.zaloNickname,
    role: user.role,
    balance: user.balance,
  });
}