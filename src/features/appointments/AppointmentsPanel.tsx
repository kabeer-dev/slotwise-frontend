'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { DateBlock } from '@/components/Ticket';
import { Button, Notice, StatusBadge } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { formatTime } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import type { Appointment } from '@/lib/types';
import { BookingForm } from './BookingForm';

type Scope = 'upcoming' | 'history';

export function AppointmentsPanel() {
  const [scope, setScope] = useState<Scope>('upcoming');
  const [formOpen, setFormOpen] = useState(false);
  const appointments = useQuery({ queryKey: queryKeys.appointments(scope), queryFn: () => api.appointments.list(scope) });

  return (
    <section aria-labelledby="appointments-heading" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 id="appointments-heading" className="text-lg font-bold">
          Your appointments
        </h2>
        <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setFormOpen(true)}>
          Book with form
        </Button>
      </div>

      <div role="tablist" aria-label="Which appointments" className="mx-5 mt-4 grid grid-cols-2 rounded-[10px] bg-ink/5 p-1">
        {(['upcoming', 'history'] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={scope === s}
            onClick={() => setScope(s)}
            className={clsx(
              'h-8 rounded-[8px] text-sm font-semibold transition-colors',
              scope === s ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
            )}
          >
            {s === 'upcoming' ? 'Upcoming' : 'Past and cancelled'}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {appointments.isLoading ? (
          <ListSkeleton />
        ) : appointments.isError ? (
          <div className="mt-3">
            <Notice tone="error">
              Couldn&apos;t load your appointments.{' '}
              <button className="font-semibold underline" onClick={() => void appointments.refetch()}>
                Try again
              </button>
            </Notice>
          </div>
        ) : appointments.data?.length === 0 ? (
          <EmptyState scope={scope} onBook={() => setFormOpen(true)} />
        ) : (
          <ul className="divide-y divide-line">
            {appointments.data?.map((a) => (
              <AppointmentRow key={a.id} appointment={a} />
            ))}
          </ul>
        )}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Book an appointment">
        <BookingForm onBooked={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Modal>
    </section>
  );
}

function AppointmentRow({ appointment: a }: { appointment: Appointment }) {
  const { business } = useSession();
  const tz = business.timezone;
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const live = a.status === 'confirmed' || a.status === 'pending';
  const upcoming = live && new Date(a.startsAt) > new Date();

  const cancel = useMutation({
    mutationFn: () => api.appointments.cancel(a.id),
    onSuccess: () => {
      toast.success('Appointment cancelled');
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availability() });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not cancel the appointment'),
    onSettled: () => setConfirming(false),
  });

  return (
    <li className="flex gap-3 py-4">
      <DateBlock iso={a.startsAt} tz={tz} muted={!live} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx('font-bold leading-snug', !live && 'text-ink-soft')}>{a.service.name}</p>
          {a.status !== 'confirmed' ? <StatusBadge status={a.status} /> : null}
        </div>
        <p className="tabular text-[15px] text-ink-soft">
          {formatTime(a.startsAt, tz)} to {formatTime(a.endsAt, tz)}
        </p>
        {a.notes ? <p className="mt-0.5 truncate text-sm text-ink-faint" title={a.notes}>“{a.notes}”</p> : null}

        {upcoming ? (
          confirming ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[10px] bg-danger-soft px-3 py-2">
              <span className="text-sm text-danger">Cancel this appointment?</span>
              <Button size="sm" variant="danger" className="bg-surface" loading={cancel.isPending} onClick={() => cancel.mutate()}>
                Yes, cancel
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={cancel.isPending}>
                Keep it
              </Button>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)} className="mt-1 text-sm font-semibold text-ink-faint hover:text-danger">
              Cancel appointment
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}

function EmptyState({ scope, onBook }: { scope: Scope; onBook: () => void }) {
  if (scope === 'history') {
    return <p className="mt-6 text-[15px] text-ink-faint">Past and cancelled appointments will appear here.</p>;
  }
  return (
    <div className="mt-6 rounded-[14px] border border-dashed border-line-strong p-5">
      <p className="font-semibold">No upcoming appointments</p>
      <p className="mt-1 text-[15px] text-ink-soft">Tell the assistant what you need, or pick a time yourself.</p>
      <Button className="mt-4" variant="secondary" size="sm" onClick={onBook}>
        Book with form
      </Button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-line" aria-label="Loading appointments">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex animate-pulse gap-3 py-4">
          <div className="h-[62px] w-[58px] rounded-[12px] bg-ink/5" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-4 w-2/3 rounded bg-ink/5" />
            <div className="h-3.5 w-1/3 rounded bg-ink/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
