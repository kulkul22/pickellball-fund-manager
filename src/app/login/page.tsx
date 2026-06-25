'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dumbbell, Loader2, LogIn } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Đăng nhập thất bại');
        return;
      }

      login(data);
      toast({ title: 'Đăng nhập thành công', description: `Xin chào, ${data.name}!` });

      if (data.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch {
      setError('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 via-white to-amber-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Quản lý quỹ Pickleball</h1>
            <p className="text-xs text-muted-foreground">Theo dõi chi phí & thanh toán</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-1">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-2">
              <LogIn className="h-7 w-7 text-emerald-600" />
            </div>
            <CardTitle className="text-xl">Đăng nhập</CardTitle>
            <CardDescription>
              Nhập tên đăng nhập để tiếp tục
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Tên đăng nhập</Label>
                <Input
                  id="username"
                  placeholder="VD: admin, an, binh"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Đăng nhập
              </Button>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground text-center mb-2">
                  Tài khoản demo:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { user: 'admin', label: 'Admin Tuấn' },
                    { user: 'an', label: 'User An' },
                    { user: 'binh', label: 'User Bình' },
                  ].map((item) => (
                    <button
                      key={item.user}
                      type="button"
                      onClick={() => {
                        setUsername(item.user);
                        setError('');
                      }}
                      className="text-xs px-2 py-1.5 rounded-lg border bg-white hover:bg-muted transition-colors text-center"
                    >
                      <span className="font-medium">{item.user}</span>
                      <br />
                      <span className="text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
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