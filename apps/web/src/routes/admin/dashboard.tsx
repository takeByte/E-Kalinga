import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, Clock3, UserCog, Users } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { opsNav } from '../../components/ops-nav';
import { CardHeading, StatTile, panel, primaryButton, secondaryButton } from '../../components/app-ui';
import { getSession } from '../../lib/auth';
import { overview } from '../../lib/api';
import { getTodayService } from '../../lib/schedule';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const reduceMotion = useReducedMotion();
  const session = getSession();
  const service = getTodayService();
  const [counts, setCounts] = useState<{
    today: number;
    pending: number;
    totalPatients: number;
    activeStaff?: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    overview()
      .then((r) => {
        if (!cancelled) setCounts(r);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const v = (n: number | undefined) => (counts === null ? '—' : String(n ?? 0));

  const rise = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
  const riseTransition = { type: 'spring', bounce: 0, duration: 0.35 } as const;

  return (
    <DashboardShell
      title="Admin Dashboard"
      subtitle="Everything happening at the center, at a glance"
      roleLabel="Admin"
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${service.name} — ${service.detail}`}
      nav={opsNav(session?.role)}
      notificationsTo="/staff/notifications"
    >
      <motion.div {...rise} transition={riseTransition} className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CalendarCheck}
          label="Today"
          value={v(counts?.today)}
          hint="Confirmed + pending visits"
        />
        <StatTile
          icon={Clock3}
          label="Pending requests"
          value={v(counts?.pending)}
          hint={counts?.pending === 0 ? 'Queue is clear' : 'Needs review'}
          tone="amber"
        />
        <StatTile
          icon={Users}
          label="Total patients"
          value={v(counts?.totalPatients)}
          hint="Registered patient accounts"
          tone="sky"
        />
        <StatTile
          icon={UserCog}
          label="Staff accounts"
          value={v(counts?.activeStaff)}
          hint="Active staff + admins"
          tone="slate"
        />
      </motion.div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <motion.section {...rise} transition={{ ...riseTransition, delay: 0.04 }} className={panel}>
          <CardHeading
            title="Triage queue"
            description={
              counts === null
                ? 'Loading…'
                : counts.pending === 0
                  ? 'Nothing waiting — the queue is clear.'
                  : `${counts.pending} request${counts.pending === 1 ? '' : 's'} need${counts.pending === 1 ? 's' : ''} review.`
            }
          />
          <Link to="/staff/appointments" className={`${primaryButton} mt-4 h-10 px-4 text-[13px]`}>
            Open the queue <ArrowRight size={15} aria-hidden />
          </Link>
        </motion.section>

        <motion.section {...rise} transition={{ ...riseTransition, delay: 0.08 }} className={panel}>
          <CardHeading
            title="Service utilization"
            description="Completed visits per service for the last 30 days."
          />
          <Link to="/staff/reports" className={`${secondaryButton} mt-4 h-10 px-4 text-[13px]`}>
            Open reports <ArrowRight size={15} aria-hidden />
          </Link>
        </motion.section>
      </div>
    </DashboardShell>
  );
}
