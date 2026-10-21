import type { ComponentType, ReactNode } from 'react';
import type { Appointment } from '../lib/api';
import { cn } from '../lib/utils';

/**
 * Shared building blocks for the patient app. Everything here is deliberately
 * tiny: the point is that spacing, radii, type and colour are decided once, so
 * seven pages can't drift apart.
 */

/** Full-width gradient action — one per screen, same shape as the login button. */
export const primaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_6px_18px_-8px_rgba(13,148,136,0.7)] transition-transform active:scale-[0.97] disabled:opacity-60';

/** The quieter companion action: white surface, hairline border. */
export const secondaryButton =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] disabled:opacity-60';

/** Small pill action used inside cards and rows. */
export const chipButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97]';

export const cardPadding = 'p-5 sm:p-6';

const STATUS_STYLE: Record<Appointment['status'], string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  confirmed: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  declined: 'bg-red-50 text-red-700 ring-red-600/20',
  completed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-400/20',
};

export function StatusChip({ status, className }: { status: Appointment['status']; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ring-1 ring-inset',
        STATUS_STYLE[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

export function CardHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** A number, a label and one line of context. Used in a row of three. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'teal',
}: {
  icon: ComponentType<{ size?: number | string; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'teal' | 'amber' | 'slate';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'slate'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-teal-600/10 text-teal-700';

  return (
    <div className="app-card flex items-center gap-3.5 p-4">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', toneClass)}>
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="font-display text-xl font-semibold leading-tight tracking-[-0.02em] text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

/** Empty and loading copy share one shape so a page never jumps when data lands. */
export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('rounded-xl border border-dashed border-slate-300/70 bg-white/40 px-4 py-3.5 text-[13px] leading-5 text-slate-600', className)}>
      {children}
    </p>
  );
}

export function InlineNotice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn('rounded-xl bg-destructive/10 px-4 py-3 text-[13px] font-medium text-destructive', className)}>
      {children}
    </p>
  );
}
