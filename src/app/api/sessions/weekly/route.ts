import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper: get ISO week number (Mon-Sun) and year
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function isoWeekKey(date: Date): string {
  const { year, week } = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get("week"); // e.g. "2026-W26"

  // Fetch all sessions with participants
  const sessions = await db.session.findMany({
    include: {
      payer: { select: { id: true, name: true, username: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  // Group sessions by ISO week
  const weekMap: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    const key = isoWeekKey(new Date(s.date));
    if (!weekMap[key]) weekMap[key] = [];
    weekMap[key].push(s);
  }

  // All available weeks (sorted desc)
  const availableWeeks = Object.keys(weekMap).sort((a, b) => b.localeCompare(a));

  // Determine which week to return
  const targetWeek = weekParam && weekMap[weekParam] ? weekParam : availableWeeks[0] ?? null;

  if (!targetWeek) {
    return NextResponse.json({ availableWeeks: [], targetWeek: null, sessions: [], participants: [], settledPairs: [] });
  }

  const weekSessions = weekMap[targetWeek] ?? [];

  // Collect all unique participants in this week (ordered by custom couple rules)
  const participantMap: Record<string, { id: string; name: string; username: string }> = {};
  for (const s of weekSessions) {
    for (const p of s.participants) {
      participantMap[p.user.id] = p.user;
    }
  }

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

  const participants = Object.values(participantMap).sort((a, b) => {
    const groupA = getGroupKey(a);
    const groupB = getGroupKey(b);
    const comp = groupA.localeCompare(groupB, "vi");
    if (comp !== 0) return comp;
    return getSubOrder(a) - getSubOrder(b);
  });

  // Fetch all SETTLED settlements to determine who has paid whom
  const settledSettlements = await db.settlement.findMany({
    where: { status: "SETTLED" },
    select: { fromUserId: true, toUserId: true },
  });

  // Build a Set of "fromUserId|toUserId" pairs that are fully settled
  const settledPairs = settledSettlements.map(
    (s) => `${s.fromUserId}|${s.toUserId}`
  );

  return NextResponse.json({
    availableWeeks,
    targetWeek,
    participants,
    sessions: weekSessions,
    settledPairs,
  });
}
