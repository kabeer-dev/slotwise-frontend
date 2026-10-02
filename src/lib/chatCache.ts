import type { ChatMessage, ChatSession } from './types';

const numericId = (m: ChatMessage) => (m.id.startsWith('temp-') ? Number.MAX_SAFE_INTEGER : Number(m.id));

/**
 * Insert or replace a message in a cached list.
 * A server message replaces its optimistic copy (matched by clientMessageId),
 * and events arriving twice (HTTP response + socket push) are de-duplicated by id.
 */
export function upsertMessage(list: ChatMessage[] | undefined, message: ChatMessage): ChatMessage[] {
  const current = list ?? [];
  const without = current.filter(
    (m) => m.id !== message.id && !(message.clientMessageId && m.clientMessageId === message.clientMessageId && m.id.startsWith('temp-')),
  );
  return [...without, message].sort((a, b) => numericId(a) - numericId(b));
}

export function upsertSession(list: ChatSession[] | undefined, session: ChatSession): ChatSession[] {
  const rest = (list ?? []).filter((s) => s.id !== session.id);
  return [session, ...rest].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}
