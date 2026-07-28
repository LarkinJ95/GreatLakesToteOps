import { useState, type ReactNode } from 'react';
import { NavLink, Link, Navigate } from 'react-router';
import {
  ClipboardList, Inbox, LayoutDashboard, LogOut, Menu, Package,
  Settings, Truck, Users, Wallet, Boxes, X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';

const menu = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/ops' },
  { icon: Inbox, label: 'Inquiries', path: '/ops/inquiries' },
  { icon: Users, label: 'Customers', path: '/ops/customers' },
  { icon: ClipboardList, label: 'Order Desk', path: '/ops/orders' },
  { icon: Truck, label: 'Dispatch', path: '/ops/dispatch' },
  { icon: Wallet, label: 'Billing', path: '/ops/billing' },
  { icon: Boxes, label: 'Inventory', path: '/ops/inventory' },
  { icon: Settings, label: 'Admin', path: '/ops/admin' },
];

export function OpsLayout({ children, title }: { children: ReactNode; title: string }) {
  const { user, isLoading, logout, isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-charcoal-50">
        <div className="flex items-center gap-3 text-navy-700">
          <Package className="h-6 w-6 animate-pulse" aria-hidden />
          <span className="font-semibold">Loading ToteOps…</span>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/ops/login" replace />;

  const nav = (
    <nav aria-label="ToteOps" className="flex flex-1 flex-col gap-1 p-4">
      {menu.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/ops'}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? 'bg-teal text-white' : 'text-navy-100 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-charcoal-50">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-navy-800 lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 p-4">
          <div className="rounded-lg bg-white p-1.5">
            <img src={logo} alt="" className="h-8 w-auto" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-white">ToteOps</p>
            <p className="text-xs text-navy-200">Operations dashboard</p>
          </div>
        </div>
        {nav}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name ?? 'Staff'}</p>
              <p className="truncate text-xs text-navy-200">{user?.email}</p>
            </div>
            <button onClick={logout} aria-label="Sign out"
              className="rounded-lg p-2 text-navy-100 hover:bg-white/10 hover:text-white">
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/60" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-800">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <p className="text-sm font-extrabold text-white">ToteOps</p>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-white">
                <X className="h-6 w-6" aria-hidden />
              </button>
            </div>
            {nav}
            <div className="border-t border-white/10 p-4">
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-navy-100 hover:bg-white/10">
                <LogOut className="h-5 w-5" aria-hidden /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 text-navy-700 hover:bg-mist lg:hidden"
            onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <h1 className="text-lg font-extrabold text-navy-700">{title}</h1>
          <div className="ml-auto">
            <Link to="/" className="text-xs font-semibold text-charcoal-300 hover:text-teal">
              View marketing site →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
