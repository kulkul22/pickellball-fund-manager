'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeftRight,
  Plus,
  Receipt,
  History,
  Send,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Dumbbell,
  LogOut,
  UserCog,
} from 'lucide-react';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

/* ─── Types ─── */
interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  balance: number;
}

interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: string;
  fromUser: { id: string; name: string; role: string };
  toUser: { id: string; name: string; role: string };
  createdAt: string;
}

/* ─── Component ─── */
export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, logout, updateBalance } = useAuthStore();

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [settling, setSettling] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formPayerId, setFormPayerId] = useState('');
  const [formParticipants, setFormParticipants] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authUser) {
      router.replace('/login');
    }
  }, [authUser, router]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      // Update balance in auth store
      const me = data.find((u: User) => u.id === authUser?.id);
      if (me) updateBalance(me.balance);
    } catch {
      toast({ title: 'Lỗi', description: 'Không tải được danh sách user', variant: 'destructive' });
    }
  }, [authUser?.id, toast, updateBalance]);

  // Fetch settlements for current user
  const fetchSettlements = useCallback(async () => {
    if (!authUser) return;
    try {
      const res = await fetch(`/api/settlements?userId=${authUser.id}`);
      const data = await res.json();
      setSettlements(data);
    } catch {
      setSettlements([]);
    }
  }, [authUser]);

  // Initialize
  useEffect(() => {
    if (authUser) {
      Promise.all([fetchUsers(), fetchSettlements()]).then(() => setLoading(false));
    }
  }, [authUser, fetchUsers, fetchSettlements]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Toggle participant in form
  const toggleParticipant = (userId: string) => {
    setFormParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Create session
  const handleCreateSession = async () => {
    if (!formDate || !formLocation || !formCost || !formPayerId || formParticipants.length === 0) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền đầy đủ thông tin', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          location: formLocation,
          totalCost: parseInt(formCost),
          payerId: formPayerId,
          participantIds: formParticipants,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi tạo session');
      }

      toast({ title: 'Thành công', description: 'Đã tạo buổi đánh mới' });
      setModalOpen(false);
      setFormDate('');
      setFormLocation('');
      setFormCost('');
      setFormPayerId('');
      setFormParticipants([]);
      await fetchUsers();
      await fetchSettlements();
    } catch (e: unknown) {
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Settlement action
  const handleSettlementAction = async (settlementId: string, action: string, userRole: string) => {
    setActionLoading(settlementId);
    try {
      const res = await fetch(`/api/settlements/${settlementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, userRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi cập nhật');
      }

      toast({ title: 'Thành công', description: 'Đã cập nhật trạng thái' });
      await fetchSettlements();
    } catch (e: unknown) {
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Tổng kết
  const handleSettle = async () => {
    setSettling(true);
    try {
      const res = await fetch('/api/settlements', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tổng kết');

      toast({ title: 'Tổng kết thành công', description: data.message || 'Đã tạo settlements' });
      await fetchUsers();
      await fetchSettlements();
    } catch (e: unknown) {
      toast({
        title: 'Lỗi',
        description: e instanceof Error ? e.message : 'Đã xảy ra lỗi',
        variant: 'destructive',
      });
    } finally {
      setSettling(false);
    }
  };

  const balanceColor = authUser
    ? authUser.balance > 0
      ? 'text-emerald-600'
      : authUser.balance < 0
        ? 'text-red-500'
        : 'text-muted-foreground'
    : 'text-muted-foreground';

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'Chờ chuyển', variant: 'outline' },
      SENT: { label: 'Đã chuyển', variant: 'secondary' },
      SETTLED: { label: 'Đã thanh toán', variant: 'default' },
    };
    const s = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
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
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Quản lý quỹ Pickleball</h1>
              <p className="text-xs text-muted-foreground">Xin chào, {authUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin link */}
            {authUser.role === 'ADMIN' && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="gap-2 text-amber-700">
                  <UserCog className="h-4 w-4" />
                  <span className="hidden sm:inline">Quản lý user</span>
                </Button>
              </Link>
            )}

            <Link href="/history">
              <Button variant="ghost" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Lịch sử</span>
              </Button>
            </Link>

            {/* User menu */}
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
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Balance */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Số dư quỹ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tabular-nums ${balanceColor}`}>
                {authUser.balance >= 0 ? '+' : ''}{formatMoney(authUser.balance)}
              </span>
              {authUser.balance === 0 && (
                <span className="text-sm text-muted-foreground">Đã cân bằng</span>
              )}
              {authUser.balance > 0 && (
                <span className="text-sm text-emerald-600">Bạn được nợ tiền</span>
              )}
              {authUser.balance < 0 && (
                <span className="text-sm text-red-500">Bạn đang nợ</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        {authUser.role === 'ADMIN' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4" />
                  Tạo buổi đánh
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Tạo buổi đánh mới</DialogTitle>
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
                    <Label>Địa điểm</Label>
                    <Input
                      placeholder="VD: Sân Pickleball Phú Nhuận"
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
                    onClick={handleCreateSession}
                    disabled={submitting}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Tạo buổi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleSettle}
              disabled={settling}
              className="gap-2 border-amber-500 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              {settling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-4 w-4" />
              )}
              Tổng kết
            </Button>
          </div>
        )}

        {/* Pending Settlements */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Giao dịch chờ xử lý
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {settlements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Không có giao dịch chờ xử lý 🎉
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {settlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-red-600">
                          {s.fromUser.name}
                        </span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-sm font-medium text-emerald-600">
                          {s.toUser.name}
                        </span>
                        {statusBadge(s.status)}
                      </div>
                      <p className="text-lg font-semibold tabular-nums">{formatMoney(s.amount)}</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {authUser.id === s.fromUserId && s.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSettlementAction(s.id, 'SEND', authUser.role)}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Tôi đã chuyển
                        </Button>
                      )}

                      {authUser.id === s.toUserId && s.status === 'SENT' && (
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSettlementAction(s.id, 'RECEIVE', authUser.role)}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Xác nhận đã nhận
                        </Button>
                      )}

                      {authUser.role === 'ADMIN' && s.status !== 'SETTLED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs border-amber-500 text-amber-700 hover:bg-amber-50"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSettlementAction(s.id, 'ADMIN_FORCE', 'ADMIN')}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          Admin duyệt hộ
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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