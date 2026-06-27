'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, MapPin, Calendar, Users, Wallet, Loader2, LogOut, Home, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { PickleballPaddle } from '@/components/ui/pickleball-icon';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  name: string;
  zaloNickname: string;
  role: string;
}

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
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, logout } = useAuthStore();
  
  // Data states
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit form states
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formPayerId, setFormPayerId] = useState('');
  const [formParticipants, setFormParticipants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authUser) {
      router.replace('/login');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (authUser) {
      fetchSessions();
      fetchUsers();
    }
  }, [authUser]);

  async function fetchSessions() {
    try {
      const res = await fetch('/api/sessions', { cache: 'no-store' });
      const data = await res.json();
      setSessions(data);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Toggle participant in edit form (auto-toggle couples)
  const toggleParticipant = (userId: string) => {
    const u = users.find((user) => user.id === userId);
    if (!u) return;

    setFormParticipants((prev) => {
      let next = [...prev];
      const isSelected = prev.includes(userId);

      // Tìm partner tương ứng
      let partnerUsername = '';
      if (u.username === 'admin') partnerUsername = 'yen';
      else if (u.username === 'yen') partnerUsername = 'admin';
      else if (u.username === 'loc') partnerUsername = 'myvan';
      else if (u.username === 'myvan') partnerUsername = 'loc';

      const partner = users.find((user) => user.username === partnerUsername);

      if (isSelected) {
        next = next.filter((id) => id !== userId);
        if (partner) {
          next = next.filter((id) => id !== partner.id);
        }
      } else {
        if (!next.includes(userId)) next.push(userId);
        if (partner && !next.includes(partner.id)) {
          next.push(partner.id);
        }
      }
      return next;
    });
  };

  const handleEditClick = (session: Session) => {
    setEditSession(session);
    setFormDate(session.date.split('T')[0]);
    setFormLocation(session.location);
    setFormCost(String(session.totalCost));
    setFormPayerId(session.payer.id);
    setFormParticipants(session.participants.map((p) => p.user.id));
    setEditOpen(true);
  };

  const handleUpdateSession = async () => {
    if (!formDate || !formCost || !formPayerId || formParticipants.length === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${editSession?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          location: formLocation.trim() || 'Sân Pickleball',
          totalCost: parseInt(formCost),
          payerId: formPayerId,
          participantIds: formParticipants,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi cập nhật buổi đánh');
      }

      toast({ title: 'Thành công', description: 'Đã cập nhật thông tin buổi đánh' });
      setEditOpen(false);
      await fetchSessions();
    } catch (e: unknown) {
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };



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

  if (!authUser || loading) {
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Lịch sử buổi đánh</h1>
              <p className="text-xs text-muted-foreground">Tất cả các session đã tạo</p>
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
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {sessions.length === 0 ? (
          <Card className="shadow-sm">
            <div className="py-12 text-center">
              <PickleballPaddle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Chưa có buổi đánh nào được ghi nhận.</p>
              <Link href="/">
                <Button variant="link" className="mt-2">Quay lại Dashboard</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => (
              <details
                key={session.id}
                className="group rounded-xl border bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
              >
                <summary className="cursor-pointer select-none px-4 py-4 flex items-center gap-4 list-none [&::-webkit-details-marker]:hidden">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">
                    {sessions.length - idx}
                  </div>
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
                <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                  <div className="pt-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">
                        <span className="font-medium">Người trả:</span>{' '}
                        <span className="text-emerald-700 font-semibold">{session.payer.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-400" />
                      <span className="text-sm">
                        <span className="font-medium">Địa điểm:</span> {session.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-400" />
                      <span className="text-sm">
                        <span className="font-medium">Chi phí / người:</span>{' '}
                        {formatMoney(Math.floor(session.totalCost / session.participants.length))}
                      </span>
                    </div>
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

                    {authUser.role === 'ADMIN' && (
                      <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(session)}
                          className="gap-1 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </Button>
                        {/* Xóa button has been removed per Admin request to simplify page flow */}
                      </div>
                    )}
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </main>

      {/* Edit Session Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa buổi đánh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ngày</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Địa điểm (Không bắt buộc)</Label>
              <Input
                placeholder="VD: Sân Pickleball Phú Nhuận (mặc định: Sân Pickleball)"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tổng chi phí (₫)</Label>
              <Input
                type="number"
                placeholder="VD: 300000"
                value={formCost}
                onChange={(e) => setFormCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Người trả</Label>
              <Select value={formPayerId} onValueChange={setFormPayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người trả" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thành viên tham gia</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={formParticipants.includes(u.id)}
                      onCheckedChange={() => toggleParticipant(u.id)}
                    />
                    <span className="text-sm">{u.name}</span>
                    {u.zaloNickname && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" />{u.zaloNickname}
                      </span>
                    )}
                    <Badge variant="outline" className="text-xs ml-auto">
                      {u.role}
                    </Badge>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              onClick={handleUpdateSession}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          Quản lý quỹ Pickleball &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}