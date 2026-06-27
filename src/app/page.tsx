'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
  LogOut,
  UserCog,
  MessageCircle,
  BarChart3,
} from 'lucide-react';
import { PickleballPaddle } from '@/components/ui/pickleball-icon';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

/* ─── Types ─── */
interface User {
  id: string;
  username: string;
  name: string;
  zaloNickname: string;
  role: string;
  balance: number;
}

interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  status: string;
  fromUser: { id: string; name: string; zaloNickname: string; role: string };
  toUser: { id: string; name: string; zaloNickname: string; role: string };
  createdAt: string;
  debtDates?: string[];
}

interface MergedSettlement {
  id: string;
  originalIds: string[];
  fromUserId: string;
  fromUserIds: string[];
  toUserId: string;
  amount: number;
  status: string;
  createdAt: string;
  debtDates: string[];
  fromUser: {
    id: string;
    name: string;
    zaloNickname: string;
    role: string;
  };
  toUser: {
    id: string;
    name: string;
    zaloNickname: string;
    role: string;
  };
}

function getMergedSettlements(settlements: Settlement[], users: User[]): MergedSettlement[] {
  const locUser = users.find(u => u.username === 'loc');
  const myvanUser = users.find(u => u.username === 'myvan');

  const locId = locUser?.id;
  const myvanId = myvanUser?.id;

  const mergedList: MergedSettlement[] = [];
  const processedIds = new Set<string>();

  for (const s of settlements) {
    if (processedIds.has(s.id)) continue;

    const isLocOrVan = (s.fromUserId === locId || s.fromUserId === myvanId);
    
    if (isLocOrVan) {
      // Find the partner's settlement to the same receiver (toUserId)
      const partnerId = s.fromUserId === locId ? myvanId : locId;
      const partnerSettlement = partnerId 
        ? settlements.find(other => !processedIds.has(other.id) && other.id !== s.id && other.fromUserId === partnerId && other.toUserId === s.toUserId)
        : null;

      const fromUserIds = locId && myvanId ? [locId, myvanId] : [s.fromUserId];

      if (partnerSettlement) {
        processedIds.add(s.id);
        processedIds.add(partnerSettlement.id);

        const combinedDatesSet = new Set<string>();
        if (s.debtDates) s.debtDates.forEach(d => combinedDatesSet.add(d));
        if (partnerSettlement.debtDates) partnerSettlement.debtDates.forEach(d => combinedDatesSet.add(d));
        
        const debtDates = Array.from(combinedDatesSet).sort((a, b) => {
          const parseDate = (dStr: string) => {
            const [d, m, y] = dStr.split('/').map(Number);
            return new Date(y, m - 1, d).getTime();
          };
          return parseDate(a) - parseDate(b);
        });

        const status = (s.status === 'SENT' && partnerSettlement.status === 'SENT') ? 'SENT' : 'PENDING';

        mergedList.push({
          id: `${s.id},${partnerSettlement.id}`,
          originalIds: [s.id, partnerSettlement.id],
          fromUserId: s.fromUserId,
          fromUserIds,
          toUserId: s.toUserId,
          amount: s.amount + partnerSettlement.amount,
          status,
          createdAt: s.createdAt,
          debtDates,
          fromUser: {
            id: s.fromUserId,
            name: 'Lộc + Mỹ Vân',
            zaloNickname: [s.fromUser.zaloNickname, partnerSettlement.fromUser.zaloNickname].filter(Boolean).join(', '),
            role: 'USER'
          },
          toUser: s.toUser
        });
      } else {
        processedIds.add(s.id);
        mergedList.push({
          id: s.id,
          originalIds: [s.id],
          fromUserId: s.fromUserId,
          fromUserIds,
          toUserId: s.toUserId,
          amount: s.amount,
          status: s.status,
          createdAt: s.createdAt,
          debtDates: s.debtDates || [],
          fromUser: {
            ...s.fromUser,
            name: 'Lộc + Mỹ Vân'
          },
          toUser: s.toUser
        });
      }
    } else {
      processedIds.add(s.id);
      mergedList.push({
        id: s.id,
        originalIds: [s.id],
        fromUserId: s.fromUserId,
        fromUserIds: [s.fromUserId],
        toUserId: s.toUserId,
        amount: s.amount,
        status: s.status,
        createdAt: s.createdAt,
        debtDates: s.debtDates || [],
        fromUser: s.fromUser,
        toUser: s.toUser
      });
    }
  }

  return mergedList;
}

/* ─── Component ─── */
export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user: authUser, logout, updateBalance } = useAuthStore();

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [formDate, setFormDate] = useState('');
  const [formLocation, setFormLocation] = useState('Smile');
  const [formCost, setFormCost] = useState('280000');
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
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      setUsers(data);
      // Update balance in auth store
      const me = data.find((u: User) => u.id === authUser?.id);
      if (me) updateBalance(me.balance);

      // Tự động chọn Nguyên (admin) làm người trả tiền mặc định
      const adminUser = data.find((u: User) => u.username === 'admin');
      if (adminUser) {
        setFormPayerId(adminUser.id);
      }
    } catch {
      toast({ title: 'Lỗi', description: 'Không tải được danh sách user', variant: 'destructive' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Fetch settlements for current user
  const fetchSettlements = useCallback(async () => {
    if (!authUser?.id) return;
    try {
      const res = await fetch(`/api/settlements?userId=${authUser.id}`, { cache: 'no-store' });
      const data = await res.json();
      setSettlements(data);
    } catch {
      setSettlements([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Initialize — chỉ chạy 1 lần khi authUser sẵn sàng
  useEffect(() => {
    if (authUser?.id) {
      Promise.all([fetchUsers(), fetchSettlements()]).then(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Refetch khi user quay lại dashboard (navigate từ /history về /)
  useEffect(() => {
    if (authUser?.id && pathname === '/') {
      fetchUsers();
      fetchSettlements();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Tự động chọn Nguyên (admin) & Yến trong danh sách đánh khi Nguyên là người trả tiền
  useEffect(() => {
    const adminUser = users.find((u) => u.username === 'admin');
    if (adminUser && formPayerId === adminUser.id) {
      setFormParticipants((prev) => {
        let next = [...prev];
        let updated = false;
        if (!next.includes(adminUser.id)) {
          next.push(adminUser.id);
          updated = true;
        }
        const yenUser = users.find((u) => u.username === 'yen');
        if (yenUser && !next.includes(yenUser.id)) {
          next.push(yenUser.id);
          updated = true;
        }
        return updated ? next : prev;
      });
    }
  }, [formPayerId, users]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Toggle participant in form
  // Toggle participant in form (auto-toggle couples)
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

  // Create session
  const handleCreateSession = async () => {
    if (!formDate || !formCost || !formPayerId || formParticipants.length === 0) {
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
          location: formLocation.trim() || 'Sân Pickleball',
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
      setFormLocation('Smile');
      setFormCost('280000');
      
      const adminUser = users.find((u) => u.username === 'admin');
      setFormPayerId(adminUser ? adminUser.id : '');
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
      await fetchUsers();
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

  const displaySettlements = getMergedSettlements(settlements, users);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <PickleballPaddle className="h-5 w-5 text-white" />
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

            <Link href="/stats">
              <Button variant="ghost" size="sm" className="gap-2 text-emerald-700">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Thống kê</span>
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
                    <Label>Thành viên tham gia (Đã chọn: {formParticipants.length})</Label>
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
            {displaySettlements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Không có giao dịch chờ xử lý 🎉
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {displaySettlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-red-600">
                          {s.fromUser.name}
                        </span>
                        {s.fromUser.zaloNickname && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                            <MessageCircle className="h-3 w-3" />{s.fromUser.zaloNickname}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className="text-sm font-medium text-emerald-600">
                          {s.toUser.name}
                        </span>
                        {s.toUser.zaloNickname && (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                            <MessageCircle className="h-3 w-3" />{s.toUser.zaloNickname}
                          </span>
                        )}
                        {statusBadge(s.status)}
                      </div>
                      <p className="text-lg font-semibold tabular-nums">{formatMoney(s.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Ngày nợ: {s.debtDates && s.debtDates.length > 0
                          ? s.debtDates.join(', ')
                          : new Date(s.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {s.fromUserIds.includes(authUser.id) && s.status === 'PENDING' && (
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