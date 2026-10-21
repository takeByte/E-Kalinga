import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { adminNav } from '../../components/ops-nav';
import { getSession } from '../../lib/auth';
import { getAuthSettings, updateAuthSettings, type AuthSettings } from '../../lib/api';
import { getTodayService } from '../../lib/schedule';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
});

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-teal-600' : 'bg-slate-300',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}

function AdminSettings() {
  const session = getSession();
  const today = getTodayService();
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthSettings()
      .then((r) => {
        if (!cancelled) setSettings(r.settings);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load settings. Reload the page to try again.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setGoogleSignIn(next: boolean) {
    if (!settings || saving) return;
    const previous = settings;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    // Optimistic: the switch flips immediately and rolls back if the API rejects it.
    setSettings({ ...settings, googleSignInEnabled: next });
    try {
      const r = await updateAuthSettings({ googleSignInEnabled: next });
      setSettings(r.settings);
      setSaved(true);
    } catch {
      setSettings(previous);
      setSaveError('Could not save the setting. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const googleOn = settings?.googleSignInEnabled ?? false;

  return (
    <DashboardShell
      title="Settings"
      roleLabel="Admin"
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={adminNav}
      notificationsTo="/staff/notifications"
    >
      <section
        aria-labelledby="sign-in-methods-heading"
        className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_8px_30px_rgba(15,60,90,0.06)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 id="sign-in-methods-heading" className="text-base font-bold tracking-tight text-slate-900">
              Sign-in methods
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Let patients sign in with their Google account. Turning this off hides the Google button on the
              login page and blocks the Google sign-in route. Email and password login keeps working.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saving && <LoaderCircle size={18} className="animate-spin text-slate-400" aria-hidden />}
            {settings === null ? (
              <span className="text-sm text-slate-500">{loadError ? '—' : 'Loading…'}</span>
            ) : (
              <Toggle
                checked={googleOn}
                disabled={saving}
                label="Allow Google sign-in"
                onChange={setGoogleSignIn}
              />
            )}
          </div>
        </div>

        {loadError && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {loadError}
          </p>
        )}

        {saveError && (
          <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}

        {settings && !settings.googleConfigured && (
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <ShieldAlert size={16} className="mr-1.5 inline align-[-2px] text-amber-600" aria-hidden />
            Google OAuth credentials are not configured on this server, so Google sign-in cannot work either way.
          </p>
        )}

        {settings && settings.googleConfigured && !googleOn && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            Google sign-in is off. Patients who created their account through Google and never set a password
            cannot log in until it is turned back on.
          </p>
        )}

        {settings && googleOn && (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-teal-800">
            <ShieldCheck size={16} aria-hidden />
            Google sign-in is available to patients.
          </p>
        )}

        {saved && <p className="mt-2 text-sm text-slate-500">Saved.</p>}
      </section>
    </DashboardShell>
  );
}
