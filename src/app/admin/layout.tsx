'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface LayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    // 로그인 페이지는 인증 체크 스킵
    if (pathname === '/admin/login') {
      setAuthenticated(true);
      return;
    }

    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/session');
        const data = await res.json();

        if (!data.authenticated) {
          router.push('/admin/login');
        } else {
          setAuthenticated(true);
          setEmail(data.email || '');
        }
      } catch {
        router.push('/admin/login');
      }
    }

    checkAuth();
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  // 로그인 페이지는 레이아웃 없이 렌더링
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // 인증 상태 로딩 중
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-fg-secondary">인증 확인 중...</div>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/signals', label: 'Signals', icon: '📡' },
    { href: '/admin/influencers', label: 'Influencers', icon: '👥' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border-primary">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-bold text-fg-primary">
              Admin Panel
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-point/10 text-point'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-tertiary'
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-fg-tertiary hidden sm:block">
              {email}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-fg-secondary hover:text-danger transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border-primary">
        <div className="flex justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 ${
                pathname === item.href
                  ? 'text-point'
                  : 'text-fg-tertiary'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  );
}
