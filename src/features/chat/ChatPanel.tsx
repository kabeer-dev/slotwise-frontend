'use client';

import clsx from 'clsx';
import { ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { relativeTime } from '@/lib/format';
import { useRealtime, type ConnectionStatus } from '@/lib/realtime';
import type { ChatSession } from '@/lib/types';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { useChat, useConversations } from './useChat';

export function ChatPanel() {
  const conversations = useConversations();
  const chat = useChat(conversations.activeId);

  return (
    <section aria-labelledby="assistant-heading" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 id="assistant-heading" className="whitespace-nowrap text-base font-bold leading-tight sm:text-lg">
            Booking assistant
          </h2>
          <ConnectionLabel />
        </div>
        <div className="flex items-center gap-1">
          <ConversationMenu sessions={conversations.sessions} activeId={conversations.activeId} onSelect={conversations.select} />
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="size-4" aria-hidden />}
            loading={conversations.starting}
            onClick={conversations.startNew}
            disabled={chat.busy}
            aria-label="New chat"
          >
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </header>

      <MessageList
        sessionId={conversations.activeId}
        messages={chat.messages}
        loading={chat.loading}
        error={chat.error}
        onReload={chat.reload}
        assistantTyping={chat.assistantTyping}
        onSend={chat.send}
        onRetry={chat.retry}
        onConfirm={() => chat.confirmBooking()}
        confirming={chat.confirming}
      />

      <Composer onSend={chat.send} busy={chat.busy} disabled={!conversations.activeId} />
    </section>
  );
}

const STATUS: Record<ConnectionStatus, { text: string; dot: string }> = {
  live: { text: 'Live', dot: 'bg-clinic' },
  connecting: { text: 'Connecting…', dot: 'bg-ink-faint' },
  reconnecting: { text: 'Reconnecting… replies still arrive when you send', dot: 'bg-amber' },
  offline: { text: 'Live updates unavailable, replies still arrive when you send', dot: 'bg-ink-faint' },
};

function ConnectionLabel() {
  const { status } = useRealtime();
  const s = STATUS[status];
  return (
    <p className="flex items-center gap-1.5 text-sm text-ink-faint" aria-live="polite">
      <span className={clsx('size-2 rounded-full', s.dot)} aria-hidden />
      {s.text}
    </p>
  );
}

function ConversationMenu({ sessions, activeId, onSelect }: { sessions: ChatSession[]; activeId: string | null; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (sessions.length < 2) return null;

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="sm" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        History <ChevronDown className={clsx('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-[300px] overflow-hidden rounded-[14px] border border-line bg-surface shadow-[var(--shadow-panel)] animate-rise">
          <p className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink-soft">Previous conversations</p>
          <ul className="max-h-80 overflow-y-auto py-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                  }}
                  aria-current={s.id === activeId ? 'true' : undefined}
                  className={clsx('flex w-full flex-col px-4 py-2.5 text-left hover:bg-paper', s.id === activeId && 'bg-clinic-tint')}
                >
                  <span className="truncate text-[15px] font-semibold">{s.title}</span>
                  <span className="text-sm text-ink-faint">{relativeTime(s.lastMessageAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
