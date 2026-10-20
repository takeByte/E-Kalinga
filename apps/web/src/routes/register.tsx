import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { PublicHeader } from '../components/public-header';
import { Button } from '../components/ui/button';
import { DuplicateEmailError, isValidEmail, registerPatient, type RegisterData } from '../lib/auth';
import { cn } from '../lib/utils';

export const Route = createFileRoute('/register')({
  component: RegisterComponent,
});

const STEPS = ['Personal', 'Household & Emergency', 'Account & Consent'] as const;

const inputClass =
  'h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-teal-600 focus:ring-2 focus:ring-teal-600/25 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/20';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-800';

type Errors = Partial<Record<keyof RegisterData, string>>;

const emptyForm: RegisterData = {
  fullName: '',
  birthdate: '',
  sex: '',
  address: '',
  householdNumber: '',
  contactNumber: '',
  philHealthNumber: '',
  emergencyName: '',
  emergencyNumber: '',
  email: '',
  password: '',
  confirmPassword: '',
  consent: false,
};

function phoneOk(v: string): boolean {
  return /^[\d+][\d\s\-()]{6,}$/.test(v.trim());
}

function validateStep(step: number, f: RegisterData): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (!f.fullName.trim()) e.fullName = 'Enter your full name.';
    if (!f.birthdate) {
      e.birthdate = 'Enter your birthdate.';
    } else {
      const d = new Date(`${f.birthdate}T00:00:00`);
      if (Number.isNaN(d.getTime())) e.birthdate = 'Enter a valid date.';
      else if (d.getTime() > Date.now()) e.birthdate = 'Birthdate cannot be in the future.';
    }
    if (!f.sex) e.sex = 'Select an option.';
    if (!f.address.trim()) e.address = 'Enter your address.';
  }
  if (step === 1) {
    if (!f.householdNumber.trim()) e.householdNumber = 'Enter your household number.';
    if (!phoneOk(f.contactNumber)) e.contactNumber = 'Enter a valid contact number.';
    if (!f.emergencyName.trim()) e.emergencyName = 'Enter an emergency contact name.';
    if (!phoneOk(f.emergencyNumber)) e.emergencyNumber = 'Enter a valid emergency number.';
  }
  if (step === 2) {
    if (!isValidEmail(f.email)) e.email = 'Enter a valid email address.';
    if (f.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (f.confirmPassword !== f.password || !f.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    if (!f.consent) e.consent = 'Consent is required to register.';
  }
  return e;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-destructive">
      {message}
    </p>
  );
}

function RegisterComponent() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [form, setForm] = useState<RegisterData>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function set<K extends keyof RegisterData>(key: K, value: RegisterData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    if (key === 'email') {
      setDuplicate(false);
      setSubmitError(null);
    }
  }

  function goNext() {
    const errs = validateStep(step, form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validateStep(2, form);
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    setPending(true);
    setSubmitError(null);
    setDuplicate(false);
    try {
      await registerPatient(form);
      await navigate({ to: '/app/dashboard' });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        setDuplicate(true);
      } else {
        setSubmitError('Registration failed. Check your connection and try again.');
      }
    } finally {
      setPending(false);
    }
  }

  const sexOptions = ['Female', 'Male', 'Other', 'Prefer not to say'];

  return (
    <>
      <PublicHeader />
      <div className="relative flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-10 sm:items-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(135deg,#f0fdfa_0%,#eff6ff_55%,#f0fdf4_100%)]"
        />
      <motion.section
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        aria-labelledby="register-heading"
        className="w-full max-w-[720px] rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(15,60,90,0.08)] sm:p-8"
      >
        <p className="text-sm font-medium text-teal-700">HealthCentria</p>
        <h1 id="register-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Create a patient account
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Staff accounts are created by an admin — this form is for patients only.
        </p>

        <ol aria-label="Registration progress" className="mt-5 flex items-center gap-2">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : 'todo';
            return (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                    state === 'done' && 'bg-teal-600 text-white',
                    state === 'current' && 'bg-gradient-to-r from-teal-600 to-blue-600 text-white',
                    state === 'todo' && 'bg-slate-100 text-slate-500',
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    'hidden text-sm sm:block',
                    state === 'current' ? 'font-medium text-slate-900' : 'text-slate-500',
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-slate-200" />}
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} noValidate className="mt-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 * direction }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 * direction }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            >
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="reg-name" className={labelClass}>
                      Full name *
                    </label>
                    <input
                      id="reg-name"
                      autoComplete="name"
                      placeholder="Juan D. Cruz"
                      value={form.fullName}
                      onChange={(e) => set('fullName', e.target.value)}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby="reg-name-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-name-error" message={errors.fullName} />
                  </div>
                  <div>
                    <label htmlFor="reg-birthdate" className={labelClass}>
                      Birthdate *
                    </label>
                    <input
                      id="reg-birthdate"
                      type="date"
                      autoComplete="bday"
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.birthdate}
                      onChange={(e) => set('birthdate', e.target.value)}
                      aria-invalid={Boolean(errors.birthdate)}
                      aria-describedby="reg-birthdate-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-birthdate-error" message={errors.birthdate} />
                  </div>
                  <fieldset>
                    <legend className={labelClass}>Sex *</legend>
                    <div role="radiogroup" aria-label="Sex" className="grid grid-cols-2 gap-2">
                      {sexOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={form.sex === opt}
                          onClick={() => set('sex', opt)}
                          className={cn(
                            'h-11 rounded-xl border px-3 text-sm font-medium transition-colors active:scale-[0.97]',
                            form.sex === opt
                              ? 'border-teal-600 bg-teal-50 text-teal-800'
                              : 'border-input bg-background text-slate-700 hover:border-slate-300',
                          )}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <FieldError id="reg-sex-error" message={errors.sex} />
                  </fieldset>
                  <div className="sm:col-span-2">
                    <label htmlFor="reg-address" className={labelClass}>
                      Address *
                    </label>
                    <input
                      id="reg-address"
                      autoComplete="street-address"
                      placeholder="Purok, Barangay, Municipality"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      aria-invalid={Boolean(errors.address)}
                      aria-describedby="reg-address-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-address-error" message={errors.address} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-household" className={labelClass}>
                      Household number *
                    </label>
                    <input
                      id="reg-household"
                      placeholder="e.g. HH-00123"
                      value={form.householdNumber}
                      onChange={(e) => set('householdNumber', e.target.value)}
                      aria-invalid={Boolean(errors.householdNumber)}
                      aria-describedby="reg-household-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-household-error" message={errors.householdNumber} />
                  </div>
                  <div>
                    <label htmlFor="reg-contact" className={labelClass}>
                      Contact number *
                    </label>
                    <input
                      id="reg-contact"
                      type="tel"
                      autoComplete="tel"
                      placeholder="09xx xxx xxxx"
                      value={form.contactNumber}
                      onChange={(e) => set('contactNumber', e.target.value)}
                      aria-invalid={Boolean(errors.contactNumber)}
                      aria-describedby="reg-contact-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-contact-error" message={errors.contactNumber} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="reg-philhealth" className={labelClass}>
                      PhilHealth number <span className="font-normal text-slate-500">(optional)</span>
                    </label>
                    <input
                      id="reg-philhealth"
                      placeholder="xx-xxxxxxxxx-x"
                      value={form.philHealthNumber}
                      onChange={(e) => set('philHealthNumber', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="reg-emergency-name" className={labelClass}>
                      Emergency contact name *
                    </label>
                    <input
                      id="reg-emergency-name"
                      placeholder="Full name"
                      value={form.emergencyName}
                      onChange={(e) => set('emergencyName', e.target.value)}
                      aria-invalid={Boolean(errors.emergencyName)}
                      aria-describedby="reg-emergency-name-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-emergency-name-error" message={errors.emergencyName} />
                  </div>
                  <div>
                    <label htmlFor="reg-emergency-number" className={labelClass}>
                      Emergency contact number *
                    </label>
                    <input
                      id="reg-emergency-number"
                      type="tel"
                      placeholder="09xx xxx xxxx"
                      value={form.emergencyNumber}
                      onChange={(e) => set('emergencyNumber', e.target.value)}
                      aria-invalid={Boolean(errors.emergencyNumber)}
                      aria-describedby="reg-emergency-number-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-emergency-number-error" message={errors.emergencyNumber} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="reg-email" className={labelClass}>
                      Email *
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      aria-invalid={Boolean(errors.email) || duplicate}
                      aria-describedby="reg-email-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-email-error" message={errors.email} />
                    {duplicate && (
                      <p role="alert" className="mt-1.5 text-sm text-destructive">
                        Email already registered.{' '}
                        <Link to="/login" className="font-medium underline underline-offset-4">
                          Log in?
                        </Link>
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="reg-password" className={labelClass}>
                      Password * <span className="font-normal text-slate-500">(min 8 characters)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby="reg-password-error"
                        className={cn(inputClass, 'pr-11')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FieldError id="reg-password-error" message={errors.password} />
                  </div>
                  <div>
                    <label htmlFor="reg-confirm" className={labelClass}>
                      Confirm password *
                    </label>
                    <input
                      id="reg-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => set('confirmPassword', e.target.value)}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby="reg-confirm-error"
                      className={inputClass}
                    />
                    <FieldError id="reg-confirm-error" message={errors.confirmPassword} />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="reg-consent"
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        id="reg-consent"
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => set('consent', e.target.checked)}
                        aria-invalid={Boolean(errors.consent)}
                        aria-describedby="reg-consent-error"
                        className="mt-1 size-5 shrink-0 accent-teal-700"
                      />
                      <span className="text-sm leading-6 text-slate-700">
                        I consent to the collection and use of my personal and health information for
                        barangay health center services, per the Data Privacy Act of 2012 (consent v1,
                        2026-09). *
                      </span>
                    </label>
                    <FieldError id="reg-consent-error" message={errors.consent} />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="sticky bottom-4 mt-6 flex gap-3 rounded-2xl border border-slate-200/70 bg-white/85 p-2 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={goBack} className="h-12 flex-1 active:scale-[0.97]">
                <ArrowLeft size={18} aria-hidden /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                className="h-12 flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-base active:scale-[0.97]"
              >
                Continue <ArrowRight size={18} aria-hidden />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={pending}
                className="h-12 flex-1 bg-gradient-to-r from-teal-600 to-blue-600 text-base active:scale-[0.97]"
              >
                {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
                {pending ? 'Creating account…' : 'Create account'}
              </Button>
            )}
          </div>
        </form>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-teal-700 underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </motion.section>
      </div>
    </>
  );
}
