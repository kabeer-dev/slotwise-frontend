'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { AppointmentsPanel } from '@/features/appointments/AppointmentsPanel';
import { ChatPanel } from '@/features/chat/ChatPanel';

type Tab = 'assistant' | 'appointments';

export default function AssistantPage() {
  // On small screens the two panels become tabs; both stay mounted so neither loses state.
  const [tab, setTab] = useState<Tab>('assistant');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="View" className="grid shrink-0 grid-cols-2 border-b border-line bg-surface lg:hidden">
        {(
          [
            ['assistant', 'Assistant'],
            ['appointments', 'My appointments'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={clsx(
              'h-11 border-b-2 text-[15px] font-semibold',
              tab === id ? 'border-clinic text-clinic-deep' : 'border-transparent text-ink-soft',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <main className="mx-auto grid min-h-0 w-full max-w-[1320px] flex-1 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5 lg:p-5">
        <div
          className={clsx(
            'min-h-0 flex-col bg-surface lg:flex lg:overflow-hidden lg:rounded-[var(--radius-panel)] lg:border lg:border-line lg:shadow-[var(--shadow-panel)]',
            tab === 'assistant' ? 'flex' : 'hidden',
          )}
        >
          <ChatPanel />
        </div>
        <aside
          className={clsx(
            'min-h-0 flex-col bg-surface lg:flex lg:overflow-hidden lg:rounded-[var(--radius-panel)] lg:border lg:border-line lg:shadow-[var(--shadow-panel)]',
            tab === 'appointments' ? 'flex' : 'hidden',
          )}
        >
          <AppointmentsPanel />
        </aside>
      </main>
    </div>
  );
}
