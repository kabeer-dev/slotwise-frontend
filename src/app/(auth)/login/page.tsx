'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { Button, Field, Input, Notice } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const DEMO = { email: 'demo@slotwise.dev', password: 'Demo@12345' };

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = 'Enter your email address';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        setFormError(err.message);
      } else setFormError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-bold leading-tight">Sign in</h1>
      <p className="mt-2 text-[15px] text-ink-soft">Book and manage your appointments.</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        <Button type="submit" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-[12px] border border-line bg-surface p-4 text-[15px]">
        <p className="text-ink-soft">
          Trying the demo? Sign in as <span className="font-semibold text-ink">{DEMO.email}</span> with password{' '}
          <span className="font-semibold text-ink">{DEMO.password}</span>.
        </p>
        <button
          type="button"
          className="mt-2 text-sm font-semibold text-clinic hover:text-clinic-deep"
          onClick={() => {
            setEmail(DEMO.email);
            setPassword(DEMO.password);
            setErrors({});
          }}
        >
          Fill in the demo account
        </button>
      </div>

      <p className="mt-8 text-[15px] text-ink-soft">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-clinic hover:text-clinic-deep">
          Create an account
        </Link>
      </p>
    </>
  );
}
