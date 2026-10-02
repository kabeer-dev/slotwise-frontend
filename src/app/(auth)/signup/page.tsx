'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { Button, Field, Input, Notice } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const { signup } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address';
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      next.password = 'Use at least 8 characters, including a letter and a number';
    }
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await signup(fullName.trim(), email.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = err.fieldErrors();
        setErrors(fields);
        // Field-specific problems are shown inline; only show the banner for the rest.
        setFormError(Object.keys(fields).length ? null : err.message);
      } else setFormError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-bold leading-tight">Create your account</h1>
      <p className="mt-2 text-[15px] text-ink-soft">You&apos;ll be booking in under a minute.</p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-5">
        <Field label="Full name" error={errors.fullName}>
          {(p) => <Input {...p} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />}
        </Field>
        <Field label="Email" error={errors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password} hint="At least 8 characters, including a letter and a number">
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-8 text-[15px] text-ink-soft">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-clinic hover:text-clinic-deep">
          Sign in
        </Link>
      </p>
    </>
  );
}
