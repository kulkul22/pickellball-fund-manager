'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ArrowLeft,
  Dumbbell,
  Loader2,
  Pencil,
  Users,
  LogOut,
  Shield,
  User as UserIcon,
  History,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  balance: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, logout } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [saving, setSaving] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (authUser && authUser.role !== 'ADMIN') {
      router.replace('/');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (!authUser) {
      router.replace('/login');
    }
  }, [authUser, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch {
      toast({ title: 'Lỗi', description: 'Không tải được danh sách user', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authUser?.role === 'ADMIN') fetchUsers();
  }, [authUser, fetchUsers]);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditBalance(String(user.balance));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          role: editRole,
          balance: parseInt(editBalance) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi cập nhật');
      }

      toast({ title: 'Thành công', description: `Đã cập nhật ${editName}` });
      setEditOpen(false);
      await fetchUsers();
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

  const handleResetBalance = async (user: User) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: 0 }),
      });

      if (!res.ok) throw new Error('Lỗi reset balance');
      toast({ title: 'Thành công', description: `Đã reset số dư của ${user.name}` });
      await fetchUsers();
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

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  if (!authUser || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-white to-green-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-600 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Quản lý người dùng</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Dumbbell className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Lịch sử</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
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
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Tổng users</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 mx-auto text-amber-600 mb-1" />
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'ADMIN').length}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm col-span-2 sm:col-span-1">
            <CardContent className="p-4 text-center">
              <UserIcon className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'USER').length}</p>
              <p className="text-xs text-muted-foreground">Thành viên</p>
            </CardContent>
          </Card>
        </div>

        {/* User list */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Danh sách người dùng
            </CardTitle>
            <CardDescription>Chỉnh sửa thông tin, phân quyền và quản lý số dư</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{user.name}</span>
                        <Badge
                          variant={user.role === 'ADMIN' ? 'default' : 'outline'}
                          className={`text-xs shrink-0 ${
                            user.role === 'ADMIN' ? 'bg-amber-600' : ''
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>@{user.username}</span>
                        <span className={user.balance > 0 ? 'text-emerald-600' : user.balance < 0 ? 'text-red-500' : ''}>
                          Số dư: {formatMoney(user.balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {user.balance !== 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-muted-foreground"
                        disabled={saving}
                        onClick={() => handleResetBalance(user)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset dư
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3 w-3" />
                      Chỉnh sửa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={editingUser.username} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Không thể thay đổi username</p>
              </div>
              <div className="space-y-2">
                <Label>Tên hiển thị</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nhập tên hiển thị"
                />
              </div>
              <div className="space-y-2">
                <Label>Vai trò</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN - Quản trị</SelectItem>
                    <SelectItem value="USER">USER - Thành viên</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Số dư (₫)</Label>
                <Input
                  type="number"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Số dư dương = được nợ, âm = đang nợ, 0 = cân bằng
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Hủy</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="bg-amber-600 hover:bg-amber-700"
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