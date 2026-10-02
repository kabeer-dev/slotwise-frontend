/** Mirrors of the API's response shapes (see backend/src/modules/*). */

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'customer' | 'staff' | 'admin';
  createdAt: string;
}

export interface Business {
  slug: string;
  name: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  workingDays: number[];
  slotIntervalMinutes: number;
  bookingHorizonDays: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  business: Business;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Appointment {
  id: string;
  status: AppointmentStatus;
  source: 'chat' | 'form' | 'staff';
  notes: string | null;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  chatSessionId: string | null;
  service: { id: string; name: string; durationMinutes: number };
}

export interface Availability {
  date: string;
  serviceId: string;
  durationMinutes: number;
  timezone: string;
  slots: string[];
  unavailableReason: string | null;
}

export interface BookingDraft {
  stage: 'collecting' | 'awaiting_confirmation';
  serviceId: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
  clarifications: number;
}

export interface BookingSummary {
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  date: string;
  time: string;
  notes: string | null;
  startsAt: string;
}

export type FormReason = 'assistant_unavailable' | 'needs_clarification' | 'too_many_turns';

export interface FormPrefill {
  serviceId: string | null;
  date: string | null;
  time: string | null;
  notes: string | null;
}

export type ChatAction =
  | { type: 'confirm_booking'; booking: BookingSummary }
  | { type: 'booking_confirmed'; appointment: Appointment }
  | { type: 'booking_form'; reason: FormReason; prefill: FormPrefill }
  | { type: 'appointment_list'; appointments: Appointment[] };

export interface MessagePayload {
  action?: ChatAction;
  quickReplies?: string[];
  meta?: { intent?: string; ai?: 'ok' | 'fallback'; via?: 'button' | 'form' };
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  payload: MessagePayload | null;
  clientMessageId: string | null;
  createdAt: string;
  /** Client-only: optimistic message waiting for the server. */
  pending?: boolean;
  /** Client-only: send failed; can be retried with the same clientMessageId. */
  failed?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  status: 'active' | 'closed';
  bookingState: BookingDraft;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  session: ChatSession;
}
