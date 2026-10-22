import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { adminNav } from '../../components/ops-nav';
import {
  CardHeading,
  InlineNotice,
  StatusPill,
  SuccessNote,
  panel,
} from '../../components/app-ui';
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
      subtitle="How patients sign in to HealthCentria"
      roleLabel="Admin"
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={adminNav}
      notificationsTo="/staff/notifications"
      mainClassName="max-w-3xl"
    >
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <CardHeading
              title="Sign-in methods"
              description="Let patients sign in with their Google account. Turning this off hides the Google button on the login page and blocks the Google sign-in route. Email and password login keeps working."
            />
          </div>

          <div className="flex items-center gap-3">
            {saving && <LoaderCircle size={17} className="animate-spin text-slate-400" aria-hidden />}
            {settings === null ? (
              <StatusPill tone={loadError ? 'red' : 'slate'}>{loadError ? 'Unavailable' : 'Loading…'}</StatusPill>
            ) : (
              <div className="flex items-center gap-2.5">
                <StatusPill tone={googleOn ? 'teal' : 'slate'}>{googleOn ? 'On' : 'Off'}</StatusPill>
                <Toggle
                  checked={googleOn}
                  disabled={saving}
                  label="Allow Google sign-in"
                  onChange={setGoogleSignIn}
                />
              </div>
            )}
          </div>
        </div>

        {loadError && <InlineNotice className="mt-4">{loadError}</InlineNotice>}
        {saveError && <InlineNotice className="mt-4">{saveError}</InlineNotice>}

        {settings && !settings.googleConfigured && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-slate-600 ring-1 ring-inset ring-slate-200">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
            <span>
              Google OAuth credentials are not configured on this server, so Google sign-in cannot work either
              way.
            </span>
          </div>
        )}

        {settings && settings.googleConfigured && !googleOn && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-5 text-amber-900 ring-1 ring-inset ring-amber-600/20">
            Google sign-in is off. Patients who created their account through Google and never set a password
            cannot log in until it is turned back on.
          </p>
        )}

        {settings && googleOn && (
          <SuccessNote className="mt-4 flex items-center gap-1.5">
            <ShieldCheck size={15} aria-hidden />
            Google sign-in is available to patients.
          </SuccessNote>
        )}

        {saved && <p className="mt-2.5 text-[12px] font-medium text-slate-500">Saved.</p>}
      </section>
    </DashboardShell>
  );
}
