'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
  ArrowLeftRight,
  Plus,
  Receipt,
  History,
  Send,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Dumbbell,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/* ─── Types ─── */
interface User {
  id: string;
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
  const { toast } = useToast();

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      if (data.length > 0 && !selectedUserId) {
        const admin = data.find((u: User) => u.role === 'ADMIN');
        const defaultUser = admin || data[0];
        setSelectedUserId(defaultUser.id);
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không tải được danh sách user', variant: 'destructive' });
    }
  }, [selectedUserId, toast]);

  // Fetch settlements for selected user
  const fetchSettlements = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/settlements?userId=${userId}`);
      const data = await res.json();
      setSettlements(data);
    } catch {
      setSettlements([]);
    }
  }, []);

  // Initialize
  useEffect(() => {
    fetchUsers().then(() => setLoading(false));
  }, [fetchUsers]);

  // When selected user changes
  useEffect(() => {
    const user = users.find((u) => u.id === selectedUserId);
    setCurrentUser(user || null);
    fetchSettlements(selectedUserId);
  }, [selectedUserId, users, fetchSettlements]);

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
      // Reset form
      setFormDate('');
      setFormLocation('');
      setFormCost('');
      setFormPayerId('');
      setFormParticipants([]);
      // Refresh
      await fetchUsers();
      await fetchSettlements(selectedUserId);
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

  // Settlement action (SEND / RECEIVE / ADMIN_FORCE)
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
      await fetchSettlements(selectedUserId);
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

  // Tổng kết (debt simplification)
  const handleSettle = async () => {
    setSettling(true);
    try {
      const res = await fetch('/api/settlements', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Lỗi tổng kết');

      toast({
        title: 'Tổng kết thành công',
        description: data.message || 'Đã tạo settlements',
      });
      await fetchUsers();
      await fetchSettlements(selectedUserId);
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

  const balanceColor = currentUser
    ? currentUser.balance > 0
      ? 'text-emerald-600'
      : currentUser.balance < 0
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Quản lý quỹ Pickleball</h1>
              <p className="text-xs text-muted-foreground">Theo dõi chi phí & thanh toán</p>
            </div>
          </div>
          <Link href="/history">
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Lịch sử
            </Button>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* User Selector */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Label className="text-sm font-medium shrink-0">Đang đăng nhập với tư cách:</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="sm:w-[220px]">
                  <SelectValue placeholder="Chọn user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} {u.role === 'ADMIN' && '(Admin)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
                {currentUser ? (currentUser.balance >= 0 ? '+' : '') + formatMoney(currentUser.balance) : '0 ₫'}
              </span>
              {currentUser?.balance === 0 && (
                <span className="text-sm text-muted-foreground">Đã cân bằng</span>
              )}
              {currentUser && currentUser.balance > 0 && (
                <span className="text-sm text-emerald-600">Bạn được nợ tiền</span>
              )}
              {currentUser && currentUser.balance < 0 && (
                <span className="text-sm text-red-500">Bạn đang nợ</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Actions */}
        {currentUser?.role === 'ADMIN' && (
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
                      {/* fromUser + PENDING: nút "Tôi đã chuyển" */}
                      {currentUser?.id === s.fromUserId && s.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSettlementAction(s.id, 'SEND', currentUser.role)}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Tôi đã chuyển
                        </Button>
                      )}

                      {/* toUser + SENT: nút "Xác nhận đã nhận" */}
                      {currentUser?.id === s.toUserId && s.status === 'SENT' && (
                        <Button
                          size="sm"
                          className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
                          disabled={actionLoading === s.id}
                          onClick={() => handleSettlementAction(s.id, 'RECEIVE', currentUser.role)}
                        >
                          {actionLoading === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                          Xác nhận đã nhận
                        </Button>
                      )}

                      {/* ADMIN: nút "Admin duyệt hộ" */}
                      {currentUser?.role === 'ADMIN' && s.status !== 'SETTLED' && (
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