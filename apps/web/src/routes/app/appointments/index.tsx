import { createFileRoute, Link } from '@tanstack/react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, LoaderCircle } from 'lucide-react';
import { DashboardShell } from '../../../components/dashboard-shell';
import { patientNav } from '../../../components/patient-nav';
import { getSession } from '../../../lib/auth';
import { ApiError, cancelAppointment, myAppointments, type Appointment } from '../../../lib/api';
import { getTodayService } from '../../../lib/schedule';
import { cn } from '../../../lib/utils';

export const Route = createFileRoute('/app/appointments/')({
  component: MyAppointments,
});

type Tab = 'upcoming' | 'past' | 'all';

const STATUS_STYLE: Record<Appointment['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800',
  completed: 'bg-slate-200 text-slate-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function serviceName(a: Appointment): string {
  return typeof a.service === 'object' ? a.service.name : 'Service';
}

function formatDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function AppointmentCard({ appt, onCancelled }: { appt: Appointment; onCancelled: (a: Appointment) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancellable = appt.status === 'pending' || appt.status === 'confirmed';

  async function doCancel() {
    setPending(true);
    setError(null);
    try {
      const r = await cancelAppointment(appt.id);
      onCancelled(r.appointment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel. Try again.');
      setConfirming(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_8px_30px_rgba(15,60,90,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">{serviceName(appt)}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{formatDay(appt.day)}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold capitalize', STATUS_STYLE[appt.status])}>
          {appt.status}
        </span>
      </div>
      {appt.status === 'declined' && appt.declineReason && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">Reason: {appt.declineReason}</p>
      )}
      {appt.notes && <p className="mt-2 text-sm text-slate-600">Notes: {appt.notes}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {cancellable && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 h-10 rounded-xl border border-slate-300 px-4 text-sm font-medium text-slate-700 active:scale-[0.97]"
        >
          Cancel appointment
        </button>
      )}
      {cancellable && confirming && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={doCancel}
            disabled={pending}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive/10 text-sm font-semibold text-destructive active:scale-[0.97] disabled:opacity-60"
          >
            {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
            Yes, cancel it
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="h-10 flex-1 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 active:scale-[0.97]"
          >
            Keep it
          </button>
        </div>
      )}
    </article>
  );
}

function MyAppointments() {
  const reduceMotion = useReducedMotion();
  const session = getSession();
  const today = getTodayService();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [list, setList] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    myAppointments()
      .then((r) => {
        if (!cancelled) setList(r.appointments);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load appointments.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (!list) return null;
    const t = todayYMD();
    if (tab === 'upcoming') return list.filter((a) => a.day >= t && (a.status === 'pending' || a.status === 'confirmed'));
    if (tab === 'past') return list.filter((a) => a.day < t || !['pending', 'confirmed'].includes(a.status));
    return list;
  }, [list, tab]);

  return (
    <DashboardShell
      title="My Appointments"
      roleLabel="Patient"
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={patientNav}
      notificationsTo="/app/notifications"
      mainClassName="max-w-none lg:px-[1.5in]"
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div role="tablist" aria-label="Filter appointments" className="flex rounded-xl border border-slate-200 bg-white p-1">
          {(['upcoming', 'past', 'all'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'h-9 flex-1 rounded-lg px-4 text-sm font-medium capitalize transition-colors active:scale-[0.97] sm:flex-none',
                tab === t ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Link
          to="/app/appointments/new"
          search={{ service: undefined }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 font-medium text-white active:scale-[0.97]"
        >
          <CalendarDays size={18} aria-hidden /> Book new
        </Link>
      </motion.div>

      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {visible === null && !error && <p className="text-sm text-slate-500">Loading appointments…</p>}
      {visible !== null && visible.length === 0 && (
        <p className="rounded-2xl border border-slate-200/70 bg-white p-6 text-sm text-slate-600">
          {tab === 'upcoming' ? 'No upcoming appointments. Book one when ready.' : 'Nothing here yet.'}
        </p>
      )}
      {visible !== null && (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((a) => (
            <AppointmentCard
              key={a.id}
              appt={a}
              onCancelled={(updated) => setList((l) => (l ?? []).map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
