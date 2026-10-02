'use client';

import { ArrowUp } from 'lucide-react';
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui';
import { MAX_MESSAGE_LENGTH } from '@/lib/config';

export function Composer({ onSend, busy, disabled }: { onSend: (text: string) => void; busy: boolean; disabled: boolean }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = value.trim();
  const canSend = text.length > 0 && text.length <= MAX_MESSAGE_LENGTH && !busy && !disabled;

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    onSend(text);
    setValue('');
    requestAnimationFrame(resize);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  const remaining = MAX_MESSAGE_LENGTH - value.length;

  return (
    <form onSubmit={submit} className="border-t border-line bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-[760px] items-end gap-2">
        <label htmlFor="composer" className="sr-only">
          Message the booking assistant
        </label>
        <textarea
          id="composer"
          ref={ref}
          rows={1}
          value={value}
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={disabled}
          placeholder="What would you like to book?"
          onChange={(e) => {
            setValue(e.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-[14px] border border-line-strong bg-surface px-4 py-2.5 text-[15.5px] leading-relaxed placeholder:text-ink-faint hover:border-ink-faint focus:border-clinic focus:outline-none disabled:bg-paper"
        />
        <Button type="submit" disabled={!canSend} loading={busy} icon={busy ? undefined : <ArrowUp className="size-4" aria-hidden />} className="h-11 rounded-[14px]" aria-label="Send">
          <span className="hidden sm:inline">Send</span>
        </Button>
      </div>
      <div className="mx-auto mt-1.5 flex max-w-[760px] justify-between text-xs text-ink-faint">
        <span className="hidden sm:inline">Enter sends. Shift + Enter adds a new line.</span>
        {remaining < 200 ? <span className={remaining < 0 ? 'text-danger' : undefined}>{remaining} characters left</span> : null}
      </div>
    </form>
  );
}
