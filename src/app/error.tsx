'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

/** Last-resort boundary: an unexpected render error shows a recoverable screen, not a blank page. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-[420px]">
        <h1 className="text-2xl font-bold">This page hit a problem</h1>
        <p className="mt-2 text-[15px] text-ink-soft">
          Your appointments and messages are saved. Try again, and if it keeps happening, reload the page.
        </p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}
