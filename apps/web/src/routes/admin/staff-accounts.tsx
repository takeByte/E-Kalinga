import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle, Plus, X } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { adminNav } from '../../components/ops-nav';
import {
  CardHeading,
  EmptyNote,
  InlineNotice,
  StatusPill,
  fieldLabel,
  inputClass,
  panel,
  primaryButton,
  secondaryButton,
  selectClass,
} from '../../components/app-ui';
import { getSession } from '../../lib/auth';
import {
  ApiError,
  createStaffAccount,
  listStaffAccounts,
  updateStaffAccount,
  type StaffAccount,
} from '../../lib/api';
import { getTodayService } from '../../lib/schedule';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/admin/staff-accounts')({
  component: StaffAccounts,
});

function StaffAccounts() {
  const session = getSession();
  const today = getTodayService();
  const [list, setList] = useState<StaffAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPassword, setCPassword] = useState('');
  const [cRole, setCRole] = useState<'staff' | 'admin'>('staff');
  const [cShow, setCShow] = useState(false);
  const [cBusy, setCBusy] = useState(false);
  const [cError, setCError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eRole, setERole] = useState<'staff' | 'admin'>('staff');
  const [ePassword, setEPassword] = useState('');
  const [eBusy, setEBusy] = useState(false);
  const [eError, setEError] = useState<string | null>(null);

  async function reload() {
    try {
      const r = await listStaffAccounts();
      setList(r.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load accounts.');
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCError(null);
    setCBusy(true);
    try {
      await createStaffAccount({
        fullName: cName.trim(),
        email: cEmail.trim().toLowerCase(),
        password: cPassword,
        role: cRole,
      });
      setCName('');
      setCEmail('');
      setCPassword('');
      setCRole('staff');
      setShowCreate(false);
      await reload();
    } catch (err) {
      setCError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setCBusy(false);
    }
  }

  function startEdit(a: StaffAccount) {
    setEditingId(a.id);
    setEName(a.name);
    setERole(a.role);
    setEPassword('');
    setEError(null);
  }

  async function handleUpdate(e: FormEvent, id: string) {
    e.preventDefault();
    setEError(null);
    setEBusy(true);
    try {
      await updateStaffAccount(id, {
        fullName: eName.trim(),
        role: eRole,
        ...(ePassword ? { password: ePassword } : {}),
      });
      setEditingId(null);
      await reload();
    } catch (err) {
      setEError(err instanceof ApiError ? err.message : 'Could not update account.');
    } finally {
      setEBusy(false);
    }
  }

  async function toggleActive(a: StaffAccount) {
    setEError(null);
    try {
      await updateStaffAccount(a.id, { active: !a.active });
      await reload();
    } catch (err) {
      setEError(err instanceof ApiError ? err.message : 'Could not update account.');
    }
  }

  return (
    <DashboardShell
      title="Staff Accounts"
      subtitle="Who can sign in to the center's workspace"
      roleLabel="Admin"
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={adminNav}
      notificationsTo="/staff/notifications"
      mainClassName="max-w-4xl"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-slate-500">
          {list === null ? 'Loading…' : `${list.length} account${list.length === 1 ? '' : 's'}`}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={showCreate ? secondaryButton : primaryButton}
        >
          {showCreate ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
          {showCreate ? 'Close' : 'New account'}
        </button>
      </div>

      {error && <InlineNotice>{error}</InlineNotice>}

      {showCreate && (
        <form onSubmit={handleCreate} className={`${panel} grid gap-4 sm:grid-cols-2`}>
          <div className="sm:col-span-2">
            <CardHeading
              title="New staff account"
              description="Staff manage the queue. Admins also manage accounts, settings and deletions."
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sa-name" className={fieldLabel}>Full name *</label>
            <input id="sa-name" value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Nurse Joy" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sa-email" className={fieldLabel}>Email *</label>
            <input id="sa-email" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="staff@example.com" className={inputClass} />
          </div>
          <div>
            <label htmlFor="sa-role" className={fieldLabel}>Role *</label>
            <select id="sa-role" value={cRole} onChange={(e) => setCRole(e.target.value as 'staff' | 'admin')} className={selectClass}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sa-password" className={fieldLabel}>Temporary password * (min 8 characters)</label>
            <div className="relative">
              <input
                id="sa-password"
                type={cShow ? 'text' : 'password'}
                autoComplete="new-password"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                className={cn(inputClass, 'pr-11')}
              />
              <button
                type="button"
                onClick={() => setCShow((v) => !v)}
                aria-label={cShow ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800"
              >
                {cShow ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {cError && <InlineNotice className="sm:col-span-2">{cError}</InlineNotice>}
          <button type="submit" disabled={cBusy} className={`${primaryButton} sm:col-span-2`}>
            {cBusy && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
            {cBusy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}

      {eError && <InlineNotice>{eError}</InlineNotice>}

      {list !== null && list.length === 0 && <EmptyNote>No staff accounts yet.</EmptyNote>}

      <div className="grid gap-3.5">
        {(list ?? []).map((a) => (
          <article key={a.id} className={panel}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-[14.5px] font-semibold tracking-[-0.01em] text-slate-900">
                  {a.name}
                </h3>
                <p className="mt-0.5 truncate text-[12.5px] text-slate-600">{a.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusPill tone={a.role === 'admin' ? 'sky' : 'teal'}>{a.role}</StatusPill>
                <StatusPill tone={a.active ? 'teal' : 'slate'}>{a.active ? 'Active' : 'Inactive'}</StatusPill>
              </div>
            </div>
            {editingId === a.id ? (
              <form onSubmit={(e) => handleUpdate(e, a.id)} className="mt-4 grid gap-4 border-t border-slate-200/70 pt-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`edit-name-${a.id}`} className={fieldLabel}>Full name *</label>
                  <input id={`edit-name-${a.id}`} value={eName} onChange={(e) => setEName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor={`edit-role-${a.id}`} className={fieldLabel}>Role *</label>
                  <select id={`edit-role-${a.id}`} value={eRole} onChange={(e) => setERole(e.target.value as 'staff' | 'admin')} className={selectClass}>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`edit-pw-${a.id}`} className={fieldLabel}>Reset password (leave blank to keep)</label>
                  <input id={`edit-pw-${a.id}`} type="password" autoComplete="new-password" value={ePassword} onChange={(e) => setEPassword(e.target.value)} placeholder="Min 8 characters" className={inputClass} />
                </div>
                {eError && <InlineNotice className="sm:col-span-2">{eError}</InlineNotice>}
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" disabled={eBusy} className={`${primaryButton} h-9 flex-1 px-3 text-[13px]`}>
                    {eBusy && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className={`${secondaryButton} h-9 flex-1 px-3 text-[13px]`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3.5 flex gap-2">
                <button type="button" onClick={() => startEdit(a)} className={`${secondaryButton} h-9 px-3.5 text-[13px]`}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => toggleActive(a)}
                  className={cn(
                    'inline-flex h-9 items-center rounded-lg border px-3.5 text-[13px] font-semibold transition-colors active:scale-[0.97]',
                    a.active
                      ? 'border-red-200 bg-white text-destructive hover:bg-red-50'
                      : 'border-teal-600/30 bg-white text-teal-800 hover:bg-teal-50',
                  )}
                >
                  {a.active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
