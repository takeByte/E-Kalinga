import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { CalendarCheck, FileText, TrendingUp } from 'lucide-react';
import { BarChart } from '../../components/charts/bar-chart';
import { Bar } from '../../components/charts/bar';
import { BarXAxis } from '../../components/charts/bar-x-axis';
import { Grid } from '../../components/charts/grid';
import { ChartTooltip } from '../../components/charts/tooltip/chart-tooltip';
import { DashboardShell } from '../../components/dashboard-shell';
import { opsNav } from '../../components/ops-nav';
import { CardHeading, EmptyNote, InlineNotice, StatTile, panel } from '../../components/app-ui';
import { getSession } from '../../lib/auth';
import { visitsPerService, type VisitsPerServiceRow } from '../../lib/api';
import { getTodayService } from '../../lib/schedule';

export const Route = createFileRoute('/staff/reports')({
  component: Reports,
});

function Reports() {
  const session = getSession();
  const today = getTodayService();
  const [rows, setRows] = useState<VisitsPerServiceRow[] | null>(null);
  const [meta, setMeta] = useState<{ from: string; to: string; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    visitsPerService(30)
      .then((r) => {
        if (!cancelled) {
          setRows(r.rows);
          setMeta({ from: r.from, to: r.to, total: r.total });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load report.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = (rows ?? []).map((r) => ({ service: r.serviceName, visits: r.count }));

  return (
    <DashboardShell
      title="Reports"
      subtitle="Where the center's time actually went"
      roleLabel={session?.role === 'admin' ? 'Admin' : 'Staff'}
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={opsNav(session?.role)}
      notificationsTo="/staff/notifications"
    >
      <div className="grid gap-3.5 sm:grid-cols-3">
        <StatTile
          icon={FileText}
          label="Completed visits"
          value={meta === null ? '—' : meta.total}
          hint="Last 30 days"
        />
        <StatTile
          icon={CalendarCheck}
          label="Services used"
          value={rows === null ? '—' : rows.length}
          hint="At least one completed visit"
          tone="sky"
        />
        <StatTile
          icon={TrendingUp}
          label="Busiest service"
          value={rows && rows.length > 0 ? [...rows].sort((a, b) => b.count - a.count)[0].serviceName : '—'}
          hint={rows && rows.length > 0 ? `${[...rows].sort((a, b) => b.count - a.count)[0].count} visits` : 'No visits yet'}
          tone="slate"
        />
      </div>

      <section className={panel}>
        <CardHeading
          title="Visits per service"
          description={
            meta
              ? `Completed visits, ${meta.from} → ${meta.to}.`
              : 'Completed visits in the last 30 days.'
          }
        />
        <div className="mt-5">
          {error && <InlineNotice>{error}</InlineNotice>}
          {rows === null && !error && <EmptyNote>Loading report…</EmptyNote>}
          {rows !== null && rows.length === 0 && !error && (
            <EmptyNote>
              No completed visits in the last 30 days yet. Complete a visit in the appointments queue and it
              shows up here.
            </EmptyNote>
          )}
          {rows !== null && rows.length > 0 && (
            <BarChart data={data} xDataKey="service">
              <Grid horizontal />
              <Bar dataKey="visits" fill="var(--chart-line-primary)" lineCap="round" />
              <BarXAxis />
              <ChartTooltip />
            </BarChart>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
