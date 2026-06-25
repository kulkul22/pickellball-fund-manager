import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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

    // Cập nhật balance: cộng cho payer, trừ cho mỗi participant khác
    // Payer nhận: totalCost - costPerPerson (vì payer cũng là 1 participant)
    await tx.user.update({
      where: { id: payerId },
      data: { balance: { increment: totalCost - costPerPerson } },
    });

    // Mỗi participant KHÁC payer bị trừ costPerPerson
    for (const userId of participantIds) {
      if (userId !== payerId) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: costPerPerson } },
        });
      }
    }

    return session;
  });

  return NextResponse.json(result, { status: 201 });
}