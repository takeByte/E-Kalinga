import { createFileRoute } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { LoaderCircle, Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { opsNav } from '../../components/ops-nav';
import {
  EmptyNote,
  InlineNotice,
  fieldLabel,
  inputClass,
  panel,
  primaryButton,
  secondaryButton,
  selectClass,
  textareaClass,
} from '../../components/app-ui';
import { getSession } from '../../lib/auth';
import {
  ApiError,
  CATEGORY_LABELS,
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  type Announcement,
  type AnnouncementCategory,
} from '../../lib/api';
import { getTodayService } from '../../lib/schedule';
import { cn } from '../../lib/utils';

export const Route = createFileRoute('/staff/announcements')({
  component: StaffAnnouncements,
});

const CATEGORIES = Object.keys(CATEGORY_LABELS) as AnnouncementCategory[];

interface ComposerState {
  id?: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  pinned: boolean;
}

const emptyComposer: ComposerState = { title: '', body: '', category: 'general', pinned: false };

function StaffAnnouncements() {
  const reduceMotion = useReducedMotion();
  const session = getSession();
  const today = getTodayService();
  const isAdmin = session?.role === 'admin';
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composer, setComposer] = useState<ComposerState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listAnnouncements()
      .then((r) => {
        if (!cancelled) setItems(r.announcements);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load announcements.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!composer) return;
    if (!composer.title.trim() || !composer.body.trim()) {
      setFormError('Title and message are both required.');
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      if (composer.id) {
        const r = await updateAnnouncement(composer.id, {
          title: composer.title.trim(),
          body: composer.body.trim(),
          category: composer.category,
          pinned: composer.pinned,
        });
        setItems((l) => (l ?? []).map((x) => (x.id === r.announcement.id ? r.announcement : x)));
      } else {
        const r = await createAnnouncement({
          title: composer.title.trim(),
          body: composer.body.trim(),
          category: composer.category,
          pinned: composer.pinned,
        });
        setItems((l) => [r.announcement, ...(l ?? [])]);
      }
      setComposer(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not publish. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    try {
      await deleteAnnouncement(id);
      setItems((l) => (l ?? []).filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete. Try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardShell
      title="Announcements"
      subtitle="Everything posted to patients, newest first"
      roleLabel={isAdmin ? 'Admin' : 'Staff'}
      userName={session?.name}
      userEmail={session?.email ?? ''}
      todayService={`${today.name} — ${today.detail}`}
      nav={opsNav(session?.role)}
      notificationsTo="/staff/notifications"
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="flex items-center justify-between gap-3"
      >
        <p className="text-[12.5px] leading-5 text-slate-500">
          Publishing notifies registered patients by email and bell. Only admins can delete.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setComposer({ ...emptyComposer });
          }}
          className={`${primaryButton} shrink-0`}
        >
          <Plus size={16} aria-hidden /> New post
        </button>
      </motion.div>

      {error && <InlineNotice>{error}</InlineNotice>}
      {items === null && !error && <EmptyNote>Loading announcements…</EmptyNote>}
      {items !== null && items.length === 0 && (
        <EmptyNote>Nothing posted yet. Use “New post” to publish the first announcement.</EmptyNote>
      )}

      <div className="space-y-3">
        {(items ?? []).map((a) => (
          <article
            key={a.id}
            className={cn(panel, a.pinned && 'ring-1 ring-teal-600/25')}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {a.pinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-white">
                  <Pin size={11} aria-hidden /> Pinned
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-600">
                <Megaphone size={11} aria-hidden />
                {CATEGORY_LABELS[a.category]}
              </span>
            </div>
            <h3 className="mt-2 font-display text-[15px] font-semibold leading-snug tracking-[-0.01em] text-slate-900">
              {a.title}
            </h3>
            <p className="mt-1 line-clamp-3 text-[13px] leading-6 text-slate-600">{a.body}</p>
            <div className="mt-3.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  setComposer({ id: a.id, title: a.title, body: a.body, category: a.category, pinned: a.pinned });
                }}
                className={`${secondaryButton} h-9 px-3.5 text-[13px]`}
              >
                Edit
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={deletingId === a.id}
                  aria-label={`Delete ${a.title}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[13px] font-semibold text-destructive transition-colors hover:bg-red-50 active:scale-[0.97] disabled:opacity-60"
                >
                  {deletingId === a.id ? <LoaderCircle size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
                  Delete
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <AnimatePresence>
        {composer && (
          <>
            <motion.div
              aria-hidden
              onClick={() => setComposer(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-slate-900/40"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={composer.id ? 'Edit announcement' : 'New announcement'}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed inset-x-4 bottom-4 top-auto z-50 mx-auto max-w-lg rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:inset-0 sm:m-auto sm:h-fit"
            >
              <h2 className="font-display text-[17px] font-semibold tracking-[-0.02em] text-slate-900">
                {composer.id ? 'Edit post' : 'New post'}
              </h2>
              <p className="mt-1 text-[12.5px] leading-5 text-slate-500">
                Patients see this in their feed and receive a notification.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="ann-title" className={fieldLabel}>
                    Title *
                  </label>
                  <input
                    id="ann-title"
                    value={composer.title}
                    maxLength={200}
                    onChange={(e) => setComposer({ ...composer, title: e.target.value })}
                    placeholder="e.g. Prenatal moved to Wednesday this week"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="ann-category" className={fieldLabel}>
                    Category
                  </label>
                  <select
                    id="ann-category"
                    value={composer.category}
                    onChange={(e) => setComposer({ ...composer, category: e.target.value as AnnouncementCategory })}
                    className={selectClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ann-body" className={fieldLabel}>
                    Message *
                  </label>
                  <textarea
                    id="ann-body"
                    rows={4}
                    maxLength={5000}
                    value={composer.body}
                    onChange={(e) => setComposer({ ...composer, body: e.target.value })}
                    placeholder="Write the announcement in plain language…"
                    className={textareaClass}
                  />
                </div>
                <label htmlFor="ann-pinned" className="flex cursor-pointer items-center gap-3 text-[13px] font-medium text-slate-700">
                  <input
                    id="ann-pinned"
                    type="checkbox"
                    checked={composer.pinned}
                    onChange={(e) => setComposer({ ...composer, pinned: e.target.checked })}
                    className="size-5 accent-teal-700"
                  />
                  Pin to the top of the feed
                </label>
                {formError && <InlineNotice>{formError}</InlineNotice>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={submit} disabled={pending} className={`${primaryButton} flex-1`}>
                    {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden />}
                    {composer.id ? 'Save changes' : 'Publish to patients'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposer(null)}
                    disabled={pending}
                    className={`${secondaryButton} flex-1`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
