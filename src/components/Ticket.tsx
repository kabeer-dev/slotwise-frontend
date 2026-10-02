import clsx from 'clsx';
import type { ReactNode } from 'react';
import { dateParts } from '@/lib/format';

/** Big calendar-style date: weekday / day number / month. */
export function DateBlock({ iso, tz, muted, size = 'md' }: { iso: string; tz: string; muted?: boolean; size?: 'md' | 'lg' }) {
  const { weekday, day, month } = dateParts(iso, tz);
  return (
    <div
      className={clsx(
        'flex shrink-0 flex-col items-center justify-center rounded-[12px] leading-none',
        size === 'lg' ? 'w-[76px] py-3' : 'w-[58px] py-2',
        muted ? 'bg-ink/5 text-ink-faint' : 'bg-clinic-soft text-clinic-deep',
      )}
      aria-hidden
    >
      <span className="text-xs font-semibold">{weekday}</span>
      <span className={clsx('tabular font-bold tracking-tight', size === 'lg' ? 'my-1 text-[34px]' : 'my-0.5 text-2xl')}>{day}</span>
      <span className="text-xs font-semibold">{month}</span>
    </div>
  );
}

/**
 * The appointment "ticket": the one bold visual in the product. A date block,
 * the booking details, and a perforated tear line above the actions — like
 * the paper appointment card a clinic hands you.
 */
export function Ticket({
  iso,
  tz,
  title,
  children,
  footer,
  tone = 'default',
  label,
}: {
  iso: string;
  tz: string;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  tone?: 'default' | 'success';
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className={clsx(
        'w-full max-w-[420px] overflow-hidden rounded-[16px] border bg-surface shadow-[var(--shadow-ticket)] animate-rise',
        tone === 'success' ? 'border-clinic/40' : 'border-line-strong',
      )}
    >
      <div className="flex gap-4 p-4">
        <DateBlock iso={iso} tz={tz} size="lg" />
        <div className="min-w-0 flex-1 self-center">
          <h3 className="text-[17px] font-bold leading-snug text-ink">{title}</h3>
          <div className="mt-1 space-y-0.5 text-[15px] text-ink-soft">{children}</div>
        </div>
      </div>
      {footer ? (
        <>
          <div className="relative h-0 border-t-2 border-dashed border-line" aria-hidden>
            <span className="absolute -left-2 -top-2 size-4 rounded-full border border-line-strong bg-paper" />
            <span className="absolute -right-2 -top-2 size-4 rounded-full border border-line-strong bg-paper" />
          </div>
          <div className={clsx('flex flex-wrap items-center gap-2 px-4 py-3', tone === 'success' && 'bg-clinic-tint')}>{footer}</div>
        </>
      ) : null}
    </section>
  );
}
