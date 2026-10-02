'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button, Field, Input, Notice, Select, Spinner, Textarea } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/auth';
import { addDays, describeDays, formatDay, formatTime, timeLabel, todayIn } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';
import type { Appointment, FormPrefill } from '@/lib/types';

interface BookingFormProps {
  prefill?: FormPrefill | null;
  /** When the form is used inside a conversation, the booking is linked to it. */
  chatSessionId?: string;
  onBooked?: (appointment: Appointment) => void;
  onCancel?: () => void;
  compact?: boolean;
}

const GROUPS = [
  { label: 'Morning', test: (t: string) => t < '12:00' },
  { label: 'Afternoon', test: (t: string) => t >= '12:00' && t < '17:00' },
  { label: 'Evening', test: (t: string) => t >= '17:00' },
];

/**
 * The structured booking path. Used on its own ("Book with form") and as the
 * chat assistant's fallback, prefilled with whatever the conversation captured.
 */
export function BookingForm({ prefill, chatSessionId, onBooked, onCancel, compact }: BookingFormProps) {
  const { business } = useSession();
  const tz = business.timezone;
  const queryClient = useQueryClient();
  const today = todayIn(tz);
  const maxDate = addDays(today, business.bookingHorizonDays);

  const [serviceId, setServiceId] = useState(prefill?.serviceId ?? '');
  const [date, setDate] = useState(prefill?.date ?? '');
  const [time, setTime] = useState(prefill?.time ?? '');
  const [notes, setNotes] = useState(prefill?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unavailableTime, setUnavailableTime] = useState<string | null>(null);

  const services = useQuery({ queryKey: queryKeys.services, queryFn: api.services, staleTime: 5 * 60_000 });
  const dateInRange = Boolean(date) && date >= today && date <= maxDate;
  const availability = useQuery({
    queryKey: queryKeys.availability(serviceId, date),
    queryFn: ({ signal }) => api.appointments.availability(serviceId, date, signal),
    enabled: Boolean(serviceId) && dateInRange,
    staleTime: 15_000,
  });

  const slots = useMemo(() => availability.data?.slots ?? [], [availability.data]);

  // A prefilled or previously chosen time that isn't free (any more) is cleared, with an explanation.
  useEffect(() => {
    if (availability.data && time && !slots.includes(time)) {
      setUnavailableTime(time);
      setTime('');
    }
  }, [availability.data, slots, time]);

  const create = useMutation({
    mutationFn: () =>
      api.appointments.create({ serviceId, date, time, notes: notes.trim() || undefined, chatSessionId }),
    onSuccess: (appointment) => {
      toast.success('Appointment booked', {
        description: `${appointment.service.name}, ${formatDay(appointment.startsAt, tz)} at ${formatTime(appointment.startsAt, tz)}`,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availability() });
      // The confirmation message normally arrives over the socket; refetch in case it's down.
      if (chatSessionId) setTimeout(() => void queryClient.invalidateQueries({ queryKey: queryKeys.messages(chatSessionId) }), 500);
      onBooked?.(appointment);
    },
    onError: (err) => {
      if (!(err instanceof ApiError)) return setFormError('Something went wrong. Please try again.');
      setErrors(err.fieldErrors());
      setFormError(err.message);
      if (err.status === 409 || err.status === 422) {
        setTime('');
        void availability.refetch();
      }
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!serviceId) next.serviceId = 'Choose a service';
    if (!date) next.date = 'Choose a date';
    else if (!dateInRange) next.date = `Choose a date between today and ${formatDay(`${maxDate}T12:00:00Z`, 'UTC')}`;
    if (!time) next.time = 'Choose a time';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length === 0) create.mutate();
  }

  const selectedService = services.data?.find((s) => s.id === serviceId);

  return (
    <form onSubmit={submit} noValidate className={clsx('flex flex-col', compact ? 'gap-4' : 'gap-5')}>
      <Field label="Service" error={errors.serviceId}>
        {(p) => (
          <Select
            {...p}
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setUnavailableTime(null);
            }}
            disabled={services.isLoading}
          >
            <option value="">{services.isLoading ? 'Loading services…' : 'Choose a service'}</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Date"
        error={errors.date}
        hint={`Open ${describeDays(business.workingDays)}, ${timeLabel(business.opensAt)} to ${timeLabel(business.closesAt)}`}
      >
        {(p) => (
          <Input
            {...p}
            type="date"
            min={today}
            max={maxDate}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setUnavailableTime(null);
            }}
          />
        )}
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Time</legend>
        {unavailableTime ? (
          <Notice tone="warning">{timeLabel(unavailableTime)} isn&apos;t available. Pick another time below.</Notice>
        ) : null}
        {!serviceId || !dateInRange ? (
          <p className="text-sm text-ink-faint">Choose a service and date to see free times.</p>
        ) : availability.isLoading ? (
          <div className="flex items-center gap-2 py-2 text-sm text-ink-faint">
            <Spinner className="size-4" /> Checking free times…
          </div>
        ) : availability.isError ? (
          <Notice tone="error">
            Couldn&apos;t load free times.{' '}
            <button type="button" className="font-semibold underline" onClick={() => void availability.refetch()}>
              Try again
            </button>
          </Notice>
        ) : availability.data?.unavailableReason ? (
          <Notice tone="warning">{availability.data.unavailableReason}</Notice>
        ) : (
          <div className="flex flex-col gap-3">
            {GROUPS.map((group) => {
              const groupSlots = slots.filter(group.test);
              if (groupSlots.length === 0) return null;
              return (
                <div key={group.label} role="group" aria-label={group.label}>
                  <p className="mb-1.5 text-sm text-ink-faint">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {groupSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={slot === time}
                        onClick={() => {
                          setTime(slot);
                          setUnavailableTime(null);
                        }}
                        className={clsx(
                          'tabular h-9 rounded-full border px-3 text-sm font-semibold transition-colors',
                          slot === time
                            ? 'border-clinic bg-clinic text-white'
                            : 'border-line-strong bg-surface text-ink hover:border-clinic hover:text-clinic-deep',
                        )}
                      >
                        {timeLabel(slot)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {errors.time ? <p className="text-sm text-danger">{errors.time}</p> : null}
      </fieldset>

      <Field label="Notes for the clinic (optional)" error={errors.notes}>
        {(p) => (
          <Textarea
            {...p}
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="For example: sensitive gums, first visit"
          />
        )}
      </Field>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" loading={create.isPending}>
          {selectedService && time ? `Book ${timeLabel(time)}` : 'Book appointment'}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
