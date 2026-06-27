'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  LogOut,
  Home,
  CalendarDays,
} from 'lucide-react';
import { PickleballPaddle } from '@/components/ui/pickleball-icon';
import { useAuthStore } from '@/lib/auth-store';

/* ─── Types ─── */
interface Participant {
  id: string;
  name: string;
  username: string;
}

interface Session {
  id: string;
  date: string;
  location: string;
  totalCost: number;
  payer: { id: string; name: string };
  participants: { user: { id: string; name: string } }[];
}

interface WeeklyData {
  availableWeeks: string[];
  targetWeek: string | null;
  participants: Participant[];
  sessions: Session[];
  settledPairs: string[]; // "fromUserId|toUserId" pairs with SETTLED status
}

/* ─── Helpers ─── */
const DAY_NAMES: Record<number, string> = {
  0: 'CN',
  1: 'T2',
  2: 'T3',
  3: 'T4',
  4: 'T5',
  5: 'T6',
  6: 'T7',
};

function formatWeekLabel(weekKey: string): string {
  // e.g. "2026-W26" → "Tuần 26 / 2026"
  const [year, wPart] = weekKey.split('-');
  const weekNum = parseInt(wPart.replace('W', ''));

  // Get first day (Monday) of that ISO week
  const jan4 = new Date(Number(year), 0, 4); // Jan 4 is always in week 1
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

  return `Tuần ${weekNum} (${fmt(monday)} – ${fmt(sunday)} / ${year})`;
}

function formatMoney(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return amount.toLocaleString('vi-VN');
}

function formatDateShort(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr);
  const dayName = DAY_NAMES[d.getDay()] ?? '??';
  const dateFormatted = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  return { day: dayName, date: dateFormatted };
}

/* ─── Component ─── */
export default function StatsPage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuthStore();
  const [data, setData] = useState<WeeklyData | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) router.replace('/login');
  }, [authUser, router]);

  const fetchWeekly = useCallback(async (week?: string) => {
    setLoading(true);
    try {
      const url = week ? `/api/sessions/weekly?week=${week}` : '/api/sessions/weekly';
      const res = await fetch(url, { cache: 'no-store' });
      const json: WeeklyData = await res.json();
      setData(json);
      if (json.targetWeek) setSelectedWeek(json.targetWeek);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authUser) fetchWeekly();
  }, [authUser, fetchWeekly]);

  const handleWeekChange = (week: string) => {
    setSelectedWeek(week);
    fetchWeekly(week);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  /* ─── Compute totals ─── */
  const totalPerPerson: Record<string, number> = {};
  const sessionCount: Record<string, number> = {};

  if (data) {
    const adminParticipant = data.participants.find(p => p.username === 'admin');
    const yenParticipant = data.participants.find(p => p.username === 'yen');
    const locParticipant = data.participants.find(p => p.username === 'loc');
    const myvanParticipant = data.participants.find(p => p.username === 'myvan');

    for (const p of data.participants) {
      totalPerPerson[p.id] = 0;
      sessionCount[p.id] = 0;
    }
    for (const s of data.sessions) {
      const costPerPerson = Math.floor(s.totalCost / s.participants.length);
      const participantIds = new Set(s.participants.map((p) => p.user.id));
      for (const p of data.participants) {
        if (participantIds.has(p.id)) {
          // Nếu là Yến, phí sẽ cộng dồn vào Nguyên
          // Nếu là Mỹ Vân, phí sẽ cộng dồn vào Lộc
          let targetId = p.id;
          if (yenParticipant && p.id === yenParticipant.id && adminParticipant) {
            targetId = adminParticipant.id;
          } else if (myvanParticipant && p.id === myvanParticipant.id && locParticipant) {
            targetId = locParticipant.id;
          }
          totalPerPerson[targetId] = (totalPerPerson[targetId] ?? 0) + costPerPerson;
          sessionCount[p.id] = (sessionCount[p.id] ?? 0) + 1;
        }
      }
    }
  }

  /* ─── Compute settled pairs Set ─── */
  const settledPairsSet = new Set<string>(data?.settledPairs ?? []);

  /* ─── Render ─── */
  if (!authUser) return null;


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Thống kê theo tuần
              </h1>
              <p className="text-xs text-muted-foreground">Chi phí từng thành viên mỗi tuần</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                    {authUser.name.charAt(0)}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{authUser.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{authUser.name}</p>
                  <p className="text-xs text-muted-foreground">@{authUser.username}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Week selector */}
        {data && data.availableWeeks.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedWeek} onValueChange={handleWeekChange}>
              <SelectTrigger className="w-72 bg-white" id="week-select">
                <SelectValue placeholder="Chọn tuần..." />
              </SelectTrigger>
              <SelectContent>
                {data.availableWeeks.map((w) => (
                  <SelectItem key={w} value={w}>
                    {formatWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No data */}
        {!loading && (!data || data.sessions.length === 0) && (
          <Card className="shadow-sm">
            <div className="py-16 text-center">
              <PickleballPaddle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Chưa có buổi đánh nào trong tuần này.</p>
              <Link href="/">
                <Button variant="link" className="mt-2">Quay lại Dashboard</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Stats Table */}
        {!loading && data && data.sessions.length > 0 && (
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 to-amber-50">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {formatWeekLabel(data.targetWeek!)}
                <span className="ml-2 text-xs font-normal">
                  ({data.sessions.length} buổi · {data.participants.length} thành viên)
                </span>
              </CardTitle>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">✕</span>
                  Đã tham gia, chưa thanh toán
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white font-bold text-xs">✓</span>
                  Đã thanh toán
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">💰</span>
                  Người trả tiền buổi
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-max">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-36 sticky left-0 bg-muted/40 z-10">
                      Buổi / Ngày
                    </th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap">
                      Chi phí
                    </th>
                    {data.participants.map((p) => (
                      <th
                        key={p.id}
                        className="px-3 py-3 text-center font-semibold whitespace-nowrap"
                        style={{ minWidth: '80px' }}
                      >
                        <span
                          className={
                            p.id === authUser.id
                              ? 'text-emerald-700 underline underline-offset-2'
                              : 'text-foreground'
                          }
                        >
                          {p.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.map((session, idx) => {
                    const { day, date } = formatDateShort(session.date);
                    const costPerPerson = Math.floor(
                      session.totalCost / session.participants.length
                    );
                    const participantIds = new Set(session.participants.map((p) => p.user.id));
                    const isEven = idx % 2 === 0;

                    return (
                      <tr
                        key={session.id}
                        className={`border-b transition-colors hover:bg-emerald-50/50 ${isEven ? 'bg-white' : 'bg-muted/20'}`}
                      >
                        {/* Day column */}
                        <td className={`px-4 py-3 sticky left-0 z-10 ${isEven ? 'bg-white' : 'bg-muted/20'} hover:bg-emerald-50/50`}>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs shrink-0">
                              {day}
                            </span>
                            <span className="text-xs text-muted-foreground">{date}</span>
                          </div>
                        </td>

                        {/* Cost column */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold text-amber-700">
                              {formatMoney(session.totalCost)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {session.participants.length} ng · {formatMoney(costPerPerson)}/ng
                            </span>
                          </div>
                        </td>

                        {/* Participant columns */}
                        {data.participants.map((p) => {
                          const attended = participantIds.has(p.id);
                          const isPayer = p.id === session.payer.id;
                          
                          const locParticipant = data.participants.find(u => u.username === 'loc');
                          
                          let hasSettled = false;
                          if (!isPayer && attended) {
                            if (p.username === 'yen') {
                              hasSettled = true;
                            } else if (p.username === 'myvan' && locParticipant) {
                              const locIsPayer = locParticipant.id === session.payer.id;
                              const locHasSettled = settledPairsSet.has(`${locParticipant.id}|${session.payer.id}`);
                              hasSettled = locIsPayer || locHasSettled;
                            } else {
                              hasSettled = settledPairsSet.has(`${p.id}|${session.payer.id}`);
                            }
                          }

                          return (
                            <td key={p.id} className="px-3 py-3 text-center">
                              {attended ? (
                                hasSettled ? (
                                  <span
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 text-white font-bold text-base mx-auto shadow-sm"
                                    title={`${p.name} đã thanh toán ✓`}
                                  >
                                    ✓
                                  </span>
                                ) : isPayer ? (
                                  <span
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-100 text-amber-700 font-bold text-base mx-auto"
                                    title={`${p.name} — người trả tiền`}
                                  >
                                    💰
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-base mx-auto"
                                    title={`${p.name} tham gia — ${formatMoney(costPerPerson)}`}
                                  >
                                    ✕
                                  </span>
                                )
                              ) : (
                                <span className="text-muted-foreground/20 text-lg">–</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer: totals */}
                <tfoot>
                  <tr className="bg-gradient-to-r from-emerald-50 to-amber-50 border-t-2 border-emerald-200">
                    <td className="px-4 py-3 sticky left-0 bg-gradient-to-r from-emerald-50 to-amber-50 z-10">
                      <span className="font-bold text-sm">Tổng cộng</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-amber-700">
                        {formatMoney(data.sessions.reduce((s, ss) => s + ss.totalCost, 0))}
                      </span>
                    </td>
                    {data.participants.map((p) => (
                      <td key={p.id} className="px-3 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-bold text-sm ${
                              p.id === authUser.id ? 'text-emerald-700' : 'text-foreground'
                            }`}
                          >
                            {formatMoney(totalPerPerson[p.id] ?? 0)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {sessionCount[p.id] ?? 0} buổi
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        {!loading && data && data.sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.participants.map((p) => {
              const total = totalPerPerson[p.id] ?? 0;
              const count = sessionCount[p.id] ?? 0;
              const isMe = p.id === authUser.id;
              return (
                <Card
                  key={p.id}
                  className={`shadow-sm transition-all ${isMe ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isMe
                            ? 'bg-emerald-600 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {p.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-xl font-bold tabular-nums text-amber-700">
                        {formatMoney(total)}
                      </p>
                      {p.username === 'yen' && (
                        <span className="text-[10px] text-muted-foreground font-normal">(Nguyên trả)</span>
                      )}
                      {p.username === 'myvan' && (
                        <span className="text-[10px] text-muted-foreground font-normal">(Lộc trả)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count}/{data!.sessions.length} buổi
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          Quản lý quỹ Pickleball &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
