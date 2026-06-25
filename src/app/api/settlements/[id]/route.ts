import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, userRole } = body;

  const settlement = await db.settlement.findUnique({ where: { id } });

  if (!settlement) {
    return NextResponse.json({ error: "Không tìm thấy settlement" }, { status: 404 });
  }

  let newStatus: string | null = null;

  if (userRole === "ADMIN" && action === "ADMIN_FORCE") {
    newStatus = "SETTLED";
  } else if (action === "SEND" && settlement.status === "PENDING") {
    newStatus = "SENT";
  } else if (action === "RECEIVE" && settlement.status === "SENT") {
    newStatus = "SETTLED";
  } else {
    return NextResponse.json(
      { error: "Hành động không hợp lệ" },
      { status: 400 }
    );
  }

  const updated = await db.settlement.update({
    where: { id },
    data: { status: newStatus },
    include: {
      fromUser: { select: { id: true, name: true, role: true } },
      toUser: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json(updated);
}