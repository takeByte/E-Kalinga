import { Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState, type ComponentType } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { clearSession } from '../lib/auth';
import { listNotifications, type NotificationItem } from '../lib/api';
import { BellDot, NotificationCenter } from './notifications';
import { cn } from '../lib/utils';

export interface ShellNavItem {
  label: string;
  /** Omitted while the destination screen is not built yet — rendered disabled with a "soon" hint. */
  to?: string;
  icon: ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

interface DashboardShellProps {
  title: string;
  roleLabel: string;
  userName?: string;
  userEmail: string;
  todayService: string;
  nav: ShellNavItem[];
  notificationsTo: '/app/notifications' | '/staff/notifications';
  /** Extra classes for the content wrapper — use to widen/narrow a single page's layout. */
  mainClassName?: string;
  children: React.ReactNode;
}

function SidebarBody({ nav, roleLabel, todayService }: Pick<DashboardShellProps, 'nav' | 'roleLabel' | 'todayService'>) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <p className="text-lg font-bold tracking-tight text-slate-900">HealthCentria</p>
        <p className="mt-1 inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
          {roleLabel}
        </p>
        <p className="mt-3 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-3 py-2 text-xs font-medium leading-5 text-white">
          Today: {todayService}
        </p>
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((item) => {
          const Icon = item.icon;
          if (!item.to) {
            return (
              <span
                key={item.label}
                aria-disabled="true"
                title="Coming next"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400"
              >
                <Icon size={18} aria-hidden />
                {item.label}
                <span className="ml-auto text-[11px] font-medium uppercase tracking-wide">soon</span>
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              to={item.to}
              activeProps={{ className: 'bg-teal-50 font-semibold text-teal-900' }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 active:scale-[0.98]"
            >
              <Icon size={18} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function DashboardShell({ title, roleLabel, userName, userEmail, todayService, nav, notificationsTo, mainClassName, children }: DashboardShellProps) {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [drawer, setDrawer] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bellItems, setBellItems] = useState<NotificationItem[] | null>(null);
  const initial = userName?.trim()?.charAt(0) ?? userEmail.trim().charAt(0).toUpperCase();

  useEffect(() => {
    let cancelled = false;
    listNotifications()
      .then((r) => {
        if (!cancelled) {
          setUnread(r.unread);
          setBellItems(r.notifications.slice(0, 10));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function openBell() {
    setBellOpen(true);
    try {
      const r = await listNotifications();
      setUnread(r.unread);
      setBellItems(r.notifications.slice(0, 10));
    } catch {
      // Drawer keeps last known state; page shows the error.
    }
  }

  async function logout() {
    clearSession();
    await navigate({ to: '/login' });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/70 bg-white lg:block">
        <SidebarBody nav={nav} roleLabel={roleLabel} todayService={todayService} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              aria-hidden
              onClick={() => setDrawer(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -280 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl lg:hidden"
            >
              <button
                type="button"
                onClick={() => setDrawer(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
              <SidebarBody nav={nav} roleLabel={roleLabel} todayService={todayService} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bellOpen && (
          <>
            <motion.div
              aria-hidden
              onClick={() => setBellOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/40"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Notifications"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 280 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 280 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 right-0 z-50 flex w-96 max-w-[92vw] flex-col bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 px-5 py-4">
                <h2 className="font-bold text-slate-900">Notifications</h2>
                <button
                  type="button"
                  onClick={() => setBellOpen(false)}
                  aria-label="Close notifications"
                  className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {bellItems === null ? (
                  <p className="text-sm text-slate-500">Loading…</p>
                ) : (
                  <NotificationCenter
                    items={bellItems}
                    onChanged={(items) => {
                      setBellItems(items);
                      setUnread(items.filter((i) => !i.read).length);
                    }}
                  />
                )}
              </div>
              <div className="border-t border-slate-200/60 p-3">
                <Link
                  to={notificationsTo}
                  onClick={() => setBellOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl font-medium text-teal-700 hover:bg-teal-50"
                >
                  View all notifications
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
              className="flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">{title}</h1>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={openBell}
                aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
                aria-haspopup="dialog"
                className="rounded-xl active:scale-[0.97]"
              >
                <BellDot unread={unread} />
              </button>
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-blue-600 text-sm font-bold text-white"
              >
                {initial}
              </span>
              <span className="hidden max-w-44 truncate text-sm text-slate-600 xl:block">{userEmail}</span>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 active:scale-[0.97]"
              >
                <LogOut size={18} aria-hidden />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          </div>
        </header>

        <main className={cn('mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6', mainClassName)}>{children}</main>
      </div>
    </div>
  );
}
