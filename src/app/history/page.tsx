'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Users, Wallet, Loader2, Dumbbell } from 'lucide-react';

interface Participant {
  user: { id: string; name: string };
}

interface Session {
  id: string;
  date: string;
  location: string;
  totalCost: number;
  payer: { id: string; name: string };
  participants: Participant[];
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        const data = await res.json();
        setSessions(data);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Lịch sử buổi đánh</h1>
              <p className="text-xs text-muted-foreground">Tất cả các session đã tạo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {sessions.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Chưa có buổi đánh nào được ghi nhận.</p>
              <Link href="/">
                <Button variant="link" className="mt-2">Quay lại Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <details
                key={session.id}
                className="group rounded-xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                {/* Summary (always visible) */}
                <summary className="cursor-pointer select-none px-4 py-4 flex items-center gap-4 list-none [&::-webkit-details-marker]:hidden">
                  {/* Index */}
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">
                    {sessions.length - idx}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{session.location}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {session.participants.length} người
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        {formatMoney(session.totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>

                {/* Expanded details */}
                <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                  <div className="pt-3 space-y-3">
                    {/* Payer */}
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">
                        <span className="font-medium">Người trả:</span>{' '}
                        <span className="text-emerald-700 font-semibold">{session.payer.name}</span>
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <span className="text-sm">
                        <span className="font-medium">Địa điểm:</span> {session.location}
                      </span>
                    </div>

                    {/* Cost breakdown */}
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">
                        <span className="font-medium">Chi phí / người:</span>{' '}
                        {formatMoney(Math.floor(session.totalCost / session.participants.length))}
                      </span>
                    </div>

                    {/* Participants list */}
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-violet-400 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm font-medium">Thành viên:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {session.participants.map((p) => (
                            <Badge
                              key={p.user.id}
                              variant={p.user.id === session.payer.id ? 'default' : 'outline'}
                              className="text-xs"
                            >
                              {p.user.name}
                              {p.user.id === session.payer.id && ' 💰'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          Quản lý quỹ Pickleball &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}