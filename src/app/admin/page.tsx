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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Loader2,
  Pencil,
  Users,
  LogOut,
  Shield,
  User as UserIcon,
  History,
  RotateCcw,
  UserPlus,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import { PickleballPaddle } from '@/components/ui/pickleball-icon';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  username: string;
  name: string;
  zaloNickname: string;
  role: string;
  balance: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: authUser, logout } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Add member dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addName, setAddName] = useState('');
  const [addZalo, setAddZalo] = useState('');
  const [addRole, setAddRole] = useState('USER');

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editZalo, setEditZalo] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBalance, setEditBalance] = useState('');

  // Auth guards
  useEffect(() => {
    if (authUser && authUser.role !== 'ADMIN') router.replace('/');
  }, [authUser, router]);
  useEffect(() => {
    if (!authUser) router.replace('/login');
  }, [authUser, router]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
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

  /* ─── Add member ─── */
  const resetAddForm = () => {
    setAddUsername('');
    setAddName('');
    setAddZalo('');
    setAddRole('USER');
  };

  const handleAdd = async () => {
    if (!addUsername.trim() || !addName.trim()) {
      toast({ title: 'Lỗi', description: 'Vui lòng điền username và tên hiển thị', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addUsername.trim(),
          name: addName.trim(),
          zaloNickname: addZalo.trim(),
          role: addRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi tạo user');
      }

      toast({ title: 'Thành công', description: `Đã thêm thành viên ${addName.trim()}` });
      setAddOpen(false);
      resetAddForm();
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

  /* ─── Edit member ─── */
  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditZalo(user.zaloNickname);
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
          zaloNickname: editZalo.trim(),
          role: editRole,
          balance: parseInt(editBalance) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi cập nhật');
      }

      toast({ title: 'Thành công', description: `Đã cập nhật ${editName.trim()}` });
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

  /* ─── Delete member ─── */
  const handleDelete = async (userId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi xóa');
      }
      toast({ title: 'Thành công', description: 'Đã xóa thành viên' });
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

  /* ─── Reset balance ─── */
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
                <PickleballPaddle className="h-4 w-4" />
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
        {/* Stats + Add button */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <Card className="shadow-sm">
            <CardContent className="p-4 text-center">
              <UserIcon className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-2xl font-bold">{users.filter(u => u.role === 'USER').length}</p>
              <p className="text-xs text-muted-foreground">Thành viên</p>
            </CardContent>
          </Card>
          <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-full min-h-[76px]">
                <UserPlus className="h-5 w-5" />
                <span className="text-sm font-medium">Thêm thành viên</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Thêm thành viên mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Username <span className="text-red-500">*</span></Label>
                  <Input
                    value={addUsername}
                    onChange={(e) => setAddUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="VD: minh, hung"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Chỉ chữ thường, số, dấu gạch dưới. Dùng để đăng nhập.</p>
                </div>
                <div className="space-y-2">
                  <Label>Tên hiển thị <span className="text-red-500">*</span></Label>
                  <Input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="VD: Minh Trần"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      Nick Zalo
                    </span>
                  </Label>
                  <Input
                    value={addZalo}
                    onChange={(e) => setAddZalo(e.target.value)}
                    placeholder="VD: minh_deptrai"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <Select value={addRole} onValueChange={setAddRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">USER - Thành viên</SelectItem>
                      <SelectItem value="ADMIN">ADMIN - Quản trị</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Hủy</Button>
                </DialogClose>
                <Button
                  onClick={handleAdd}
                  disabled={saving || !addUsername.trim() || !addName.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <UserPlus className="h-4 w-4 mr-1" />
                  Thêm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>@{user.username}</span>
                        {user.zaloNickname && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <MessageCircle className="h-3 w-3" />
                            {user.zaloNickname}
                          </span>
                        )}
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
                        <span className="hidden sm:inline">Reset dư</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => openEdit(user)}
                    >
                      <Pencil className="h-3 w-3" />
                      Sửa
                    </Button>
                    {user.role !== 'ADMIN' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={saving}
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Xóa</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa thành viên</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc muốn xóa <strong>{user.name}</strong> (@{user.username})?
                              Hành động này không thể hoàn tác. Các session và settlement liên quan cũng sẽ bị xóa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
                <Label>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    Nick Zalo
                  </span>
                </Label>
                <Input
                  value={editZalo}
                  onChange={(e) => setEditZalo(e.target.value)}
                  placeholder="VD: minh_deptrai"
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