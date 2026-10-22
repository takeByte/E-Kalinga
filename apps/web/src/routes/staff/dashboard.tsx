import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, Clock3, FileText, Stethoscope } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { opsNav } from '../../components/ops-nav';
import { CardHeading, StatTile, panel, primaryButton, secondaryButton } from '../../components/app-ui';
import { getSession } from '../../lib/auth';
import { queueAppointments } from '../../lib/api';
import { getTodayService } from '../../lib/schedule';

export const Route = createFileRoute('/staff/dashboard')({
  component: StaffDashboard,
});

function StaffDashboard() {
  const reduceMotion = useReducedMotion();
  const session = getSession();
  const service = getTodayService();
  const [counts, setCounts] = useState<{ today: number; pending: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const t = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    Promise.all([
      queueAppointments({ from: t, to: t }).catch(() => ({ appointments: [] })),
      queueAppointments({ status: 'pending' }).catch(() => ({ appointments: [] })),
    ]).then(([todays, pendings]) => {
      if (cancelled) return;
      setCounts({
        today: todays.appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending').length,
        pending: pendings.appointments.length,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rise = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
  const riseTransition = { type: 'spring', bounce: 0, duration: 0.35 } as const;

  return (
    <DashboardShell
      title="Staff Dashboard"
      subtitle={`${service.name} today — ${service.detail}`}
      roleLabel={session?.role === 'admin' ? 'Admin' : 'Staff'}
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
          value={counts === null ? '—' : counts.today}
          hint="Confirmed + pending visits"
        />
        <StatTile
          icon={Clock3}
          label="Pending requests"
          value={counts === null ? '—' : counts.pending}
          hint={counts?.pending === 0 ? 'Queue is clear' : 'Confirm or decline'}
          tone="amber"
        />
        <StatTile
          icon={Stethoscope}
          label="Today's service"
          value={service.name}
          hint={service.detail}
          tone="sky"
        />
        <StatTile icon={FileText} label="Reports" value="30 days" hint="Visits per service" tone="slate" />
      </motion.div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <motion.section
          {...rise}
          transition={{ ...riseTransition, delay: 0.04 }}
          className={panel}
        >
          <CardHeading
            title="Pending approvals"
            description={
              counts === null
                ? 'Loading the queue…'
                : counts.pending === 0
                  ? 'Nothing waiting — the queue is clear.'
                  : `${counts.pending} request${counts.pending === 1 ? '' : 's'} need${counts.pending === 1 ? 's' : ''} review.`
            }
          />
          <Link to="/staff/appointments" className={`${primaryButton} mt-4 h-10 px-4 text-[13px]`}>
            Open the queue <ArrowRight size={15} aria-hidden />
          </Link>
        </motion.section>

        <motion.section
          {...rise}
          transition={{ ...riseTransition, delay: 0.08 }}
          className={panel}
        >
          <CardHeading
            title="Visits per service"
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
