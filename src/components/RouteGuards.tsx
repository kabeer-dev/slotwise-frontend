'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

/** Client-side guard: the token lives in localStorage, so the server can't check it during render. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'anonymous') router.replace('/login');
  }, [state.status, router]);
  return state.status === 'authenticated' ? <>{children}</> : <FullPageSpinner />;
}

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (state.status === 'authenticated') router.replace('/assistant');
  }, [state.status, router]);
  return state.status === 'anonymous' ? <>{children}</> : <FullPageSpinner />;
}
