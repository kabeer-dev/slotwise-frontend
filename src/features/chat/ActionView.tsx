'use client';

import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { DateBlock, Ticket } from '@/components/Ticket';
import { Button } from '@/components/ui';
import { useSession } from '@/lib/auth';
import { formatTime, timeLabel } from '@/lib/format';
import type { Appointment, BookingSummary, ChatAction, FormReason, FormPrefill } from '@/lib/types';
import { BookingForm } from '../appointments/BookingForm';

interface ActionViewProps {
  action: ChatAction;
  /** Only the latest assistant message's actions can be used; older ones are history. */
  interactive: boolean;
  sessionId: string;
  onConfirm: () => void;
  confirming: boolean;
}

/**
 * Payloads are stored JSON; anything malformed (older data, a bad write) is
 * skipped rather than allowed to crash the conversation.
 */
export function isRenderableAction(action: unknown): action is ChatAction {
  if (!action || typeof action !== 'object') return false;
  const a = action as Record<string, unknown> & { type?: unknown };
  switch (a.type) {
    case 'confirm_booking':
      return typeof (a.booking as BookingSummary | undefined)?.startsAt === 'string';
    case 'booking_confirmed':
      return typeof (a.appointment as Appointment | undefined)?.startsAt === 'string';
    case 'booking_form':
      return typeof a.prefill === 'object' && a.prefill !== null;
    case 'appointment_list':
      return Array.isArray(a.appointments);
    default:
      return false;
  }
}

export function ActionView({ action, interactive, sessionId, onConfirm, confirming }: ActionViewProps) {
  switch (action.type) {
    case 'confirm_booking':
      return <ConfirmTicket booking={action.booking} interactive={interactive} sessionId={sessionId} onConfirm={onConfirm} confirming={confirming} />;
    case 'booking_confirmed':
      return <BookedTicket appointment={action.appointment} />;
    case 'booking_form':
      return interactive ? <InlineBookingForm reason={action.reason} prefill={action.prefill} sessionId={sessionId} /> : null;
    case 'appointment_list':
      return <AppointmentList appointments={action.appointments} />;
  }
}

function ConfirmTicket({
  booking,
  interactive,
  sessionId,
  onConfirm,
  confirming,
}: {
  booking: BookingSummary;
  interactive: boolean;
  sessionId: string;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const { business } = useSession();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3">
      <Ticket
        label="Booking summary"
        iso={booking.startsAt}
        tz={business.timezone}
        title={booking.serviceName}
        footer={
          interactive && !editing ? (
            <>
              <Button size="sm" onClick={onConfirm} loading={confirming}>
                Confirm booking
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={confirming}>
                Change details
              </Button>
            </>
          ) : undefined
        }
      >
        <p className="tabular">
          {timeLabel(booking.time)}, {booking.durationMinutes} minutes
        </p>
        {booking.notes ? <p className="text-sm text-ink-faint">“{booking.notes}”</p> : null}
      </Ticket>
      {interactive && editing ? (
        <FormCard title="Change your booking">
          <BookingForm
            compact
            chatSessionId={sessionId}
            prefill={{ serviceId: booking.serviceId, date: booking.date, time: booking.time, notes: booking.notes }}
            onCancel={() => setEditing(false)}
          />
        </FormCard>
      ) : null}
    </div>
  );
}

function BookedTicket({ appointment }: { appointment: Appointment }) {
  const { business } = useSession();
  const tz = business.timezone;
  return (
    <Ticket
      label="Booked appointment"
      tone="success"
      iso={appointment.startsAt}
      tz={tz}
      title={appointment.service.name}
      footer={
        <p className="flex items-center gap-2 text-sm font-semibold text-clinic-deep">
          <CircleCheck className="size-4" aria-hidden /> Booked. It&apos;s in your appointments.
        </p>
      }
    >
      <p className="tabular">
        {formatTime(appointment.startsAt, tz)} to {formatTime(appointment.endsAt, tz)}
      </p>
    </Ticket>
  );
}

const FORM_TITLES: Record<FormReason, string> = {
  assistant_unavailable: 'Book with the form',
  needs_clarification: 'Pick a time',
  too_many_turns: 'Prefer to choose from a list?',
};

function InlineBookingForm({ reason, prefill, sessionId }: { reason: FormReason; prefill: FormPrefill; sessionId: string }) {
  return (
    <FormCard title={FORM_TITLES[reason]}>
      <BookingForm compact chatSessionId={sessionId} prefill={prefill} />
    </FormCard>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="w-full max-w-[480px] rounded-[16px] border border-line-strong bg-surface p-4 animate-rise">
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

function AppointmentList({ appointments }: { appointments: Appointment[] }) {
  const { business } = useSession();
  const tz = business.timezone;
  return (
    <ul className="w-full max-w-[420px] divide-y divide-line rounded-[16px] border border-line-strong bg-surface px-4">
      {appointments.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-3">
          <DateBlock iso={a.startsAt} tz={tz} />
          <div className="min-w-0">
            <p className="font-bold leading-snug">{a.service.name}</p>
            <p className="tabular text-sm text-ink-soft">
              {formatTime(a.startsAt, tz)} to {formatTime(a.endsAt, tz)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
