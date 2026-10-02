'use client';

import clsx from 'clsx';
import { RotateCw } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Notice, Spinner } from '@/components/ui';
import type { ChatMessage } from '@/lib/types';
import { ActionView, isRenderableAction } from './ActionView';

interface MessageListProps {
  sessionId: string | null;
  messages: ChatMessage[];
  loading: boolean;
  error: unknown;
  onReload: () => void;
  assistantTyping: boolean;
  onSend: (text: string) => void;
  onRetry: (message: ChatMessage) => void;
  onConfirm: () => void;
  confirming: boolean;
}

export function MessageList(props: MessageListProps) {
  const { sessionId, messages, loading, error, onReload, assistantTyping, onSend, onRetry, onConfirm, confirming } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Follow new messages only if the reader is already at the bottom.
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const last = messages.at(-1);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottom.current || last?.role === 'user') {
      el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 0 && !loading ? 'smooth' : 'auto' });
    }
  }, [last?.id, messages.length, assistantTyping, loading]);

  // Jump straight to the bottom when switching conversations.
  useEffect(() => {
    stickToBottom.current = true;
  }, [sessionId]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
  const latestIsAssistant = last?.role === 'assistant';

  return (
    <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
      <div role="log" aria-label="Conversation" aria-busy={assistantTyping} className="mx-auto flex max-w-[760px] flex-col gap-3 px-4 py-6 sm:px-6">
        {loading || !sessionId ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-faint">
            <Spinner /> Opening your conversation…
          </div>
        ) : error ? (
          <Notice tone="error">
            Couldn&apos;t load this conversation.{' '}
            <button className="font-semibold underline" onClick={onReload}>
              Try again
            </button>
          </Notice>
        ) : (
          messages.map((m) => {
            const isLatestAssistant = m.id === lastAssistantId && latestIsAssistant;
            const interactive = isLatestAssistant && !assistantTyping;
            const rawAction = m.payload?.action;
            const action = isRenderableAction(rawAction) ? rawAction : undefined;
            const rawReplies = m.payload?.quickReplies;
            const quickReplies = interactive && Array.isArray(rawReplies) ? rawReplies : undefined;
            return (
              <div key={m.id} className="flex flex-col gap-2.5">
                <Bubble message={m} onRetry={onRetry} />
                {action ? (
                  <div className="flex">
                    <ActionView action={action} interactive={interactive} sessionId={m.sessionId} onConfirm={onConfirm} confirming={confirming} />
                  </div>
                ) : null}
                {quickReplies?.length ? (
                  <div className="flex flex-wrap gap-2" aria-label="Suggested replies">
                    {quickReplies.map((q) => (
                      <button
                        key={q}
                        onClick={() => onSend(q)}
                        className="h-9 rounded-full border border-clinic/35 bg-surface px-3.5 text-sm font-semibold text-clinic-deep transition-colors hover:border-clinic hover:bg-clinic-tint"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {assistantTyping && sessionId ? <TypingIndicator /> : null}
      </div>
    </div>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: (m: ChatMessage) => void }) {
  const mine = message.role === 'user';
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className={clsx('flex flex-col gap-1', mine ? 'items-end' : 'items-start')}>
      <div
        title={time}
        className={clsx(
          'max-w-[min(85%,560px)] whitespace-pre-wrap break-words px-4 py-2.5 text-[15.5px] leading-relaxed',
          mine
            ? 'rounded-[var(--radius-bubble)] rounded-br-[6px] bg-clinic text-white'
            : 'rounded-[var(--radius-bubble)] rounded-bl-[6px] border border-line bg-surface text-ink',
          message.pending && 'opacity-60',
          message.failed && 'bg-danger/85',
          mine && !message.pending && !message.failed && 'animate-rise',
        )}
      >
        <span className="sr-only">{mine ? 'You: ' : 'Assistant: '}</span>
        {message.content}
      </div>
      {message.failed ? (
        <p className="flex items-center gap-2 text-sm text-danger" role="alert">
          Not sent: {message.failed}
          <button onClick={() => onRetry(message)} className="inline-flex items-center gap-1 font-semibold underline">
            <RotateCw className="size-3.5" aria-hidden /> Retry
          </button>
        </p>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start">
      <div className="flex items-center gap-1.5 rounded-[var(--radius-bubble)] rounded-bl-[6px] border border-line bg-surface px-4 py-3.5">
        <span className="sr-only">The assistant is typing</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 rounded-full bg-ink-faint animate-blink" style={{ animationDelay: `${i * 160}ms` }} aria-hidden />
        ))}
      </div>
    </div>
  );
}
