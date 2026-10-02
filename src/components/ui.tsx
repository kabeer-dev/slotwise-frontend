'use client';

import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import type { AppointmentStatus } from '@/lib/types';

// ---------------------------------------------------------------- Button ---

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-clinic text-white hover:bg-clinic-deep disabled:bg-clinic/45',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink-faint hover:bg-paper disabled:text-ink-faint',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink disabled:text-ink-faint',
  danger: 'text-danger hover:bg-danger-soft disabled:text-danger/50',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors disabled:cursor-not-allowed',
        size === 'md' ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-sm',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return <LoaderCircle role="status" aria-label={label} className={clsx('animate-spin text-ink-faint', className ?? 'size-5')} />;
}

// ---------------------------------------------------------------- Fields ---

interface FieldProps {
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Label + control + hint/error, with the ARIA wiring done once. */
export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const control =
  'w-full rounded-[10px] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint focus:border-clinic focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-clinic/30 aria-[invalid=true]:border-danger disabled:bg-paper disabled:text-ink-faint';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={clsx(control, 'h-11', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} className={clsx(control, 'h-11 pr-8', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(control, 'py-2.5', className)} {...rest} />;
});

// --------------------------------------------------------------- Status ---

const statusStyle: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-clinic-soft text-clinic-deep' },
  pending: { label: 'Pending', className: 'bg-amber-soft text-amber' },
  cancelled: { label: 'Cancelled', className: 'bg-ink/5 text-ink-faint' },
  completed: { label: 'Completed', className: 'bg-ink/5 text-ink-soft' },
  no_show: { label: 'Missed', className: 'bg-danger-soft text-danger' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = statusStyle[status];
  return <span className={clsx('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold', s.className)}>{s.label}</span>;
}

// --------------------------------------------------------------- Notice ---

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'error'; children: ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx(
        'rounded-[10px] px-3 py-2.5 text-sm',
        tone === 'info' && 'bg-clinic-tint text-clinic-deep',
        tone === 'warning' && 'bg-amber-soft text-[#7a5112]',
        tone === 'error' && 'bg-danger-soft text-danger',
      )}
    >
      {children}
    </div>
  );
}
