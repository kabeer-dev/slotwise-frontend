'use client';

import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/components/RouteGuards';
import { Button } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { describeDays, timeLabel } from '@/lib/format';

function PortalHeader() {
  const { state, logout } = useAuth();
  if (state.status !== 'authenticated') return null;
  const { business, user } = state;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-[17px] font-bold leading-tight text-clinic-deep">{business.name}</p>
        <p className="hidden truncate text-sm text-ink-faint sm:block">
          Open {describeDays(business.workingDays)}, {timeLabel(business.opensAt)} to {timeLabel(business.closesAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-[15px] text-ink-soft sm:inline">{user.fullName}</span>
        <Button variant="ghost" size="sm" icon={<LogOut className="size-4" aria-hidden />} onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="flex h-dvh flex-col">
        <PortalHeader />
        {children}
      </div>
    </RequireAuth>
  );
}
