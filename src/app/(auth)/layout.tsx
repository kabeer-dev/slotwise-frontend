'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { RedirectIfAuthenticated } from '@/components/RouteGuards';
import { Ticket } from '@/components/Ticket';
import { api } from '@/lib/api';
import { describeDays, timeLabel } from '@/lib/format';
import { queryKeys } from '@/lib/queryKeys';

/** Next Monday at 09:15 in the clinic's zone, for the preview ticket. */
function previewIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  return `${d.toISOString().slice(0, 10)}T04:15:00Z`;
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  const business = useQuery({ queryKey: queryKeys.business, queryFn: () => api.business(), staleTime: Infinity, retry: 1 });
  const b = business.data;
  const tz = b?.timezone ?? 'Asia/Karachi';

  return (
    <RedirectIfAuthenticated>
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <aside className="relative hidden overflow-hidden bg-clinic-deep px-12 py-12 text-white lg:flex lg:flex-col">
          <p className="text-lg font-bold">{b?.name ?? 'Your clinic'}</p>
          <div className="mt-auto max-w-[460px]">
            <h1 className="text-[44px] font-bold leading-[1.08] tracking-[-0.01em]">Book your next visit in a sentence.</h1>
            <p className="mt-4 max-w-[400px] text-[17px] leading-relaxed text-white/75">
              Tell the assistant what you need and when. It checks the clinic&apos;s calendar and books nothing until you confirm.
            </p>

            <div className="mt-10 flex flex-col gap-3" aria-hidden>
              <div className="ml-auto max-w-[80%] rounded-[18px] rounded-br-[6px] bg-white/12 px-4 py-2.5 text-[15.5px]">
                Can I get a dental cleaning on Monday morning?
              </div>
              <div className="max-w-[80%] rounded-[18px] rounded-bl-[6px] bg-white px-4 py-2.5 text-[15.5px] text-ink">
                9:15 AM on Monday is free. Shall I book it?
              </div>
              <div className="text-ink">
                <Ticket label="Preview" iso={previewIso()} tz={tz} title="Dental Cleaning">
                  <p className="tabular">9:15 AM, 45 minutes</p>
                </Ticket>
              </div>
            </div>
          </div>
          {b ? (
            <p className="mt-12 text-sm text-white/60">
              Open {describeDays(b.workingDays)}, {timeLabel(b.opensAt)} to {timeLabel(b.closesAt)}
            </p>
          ) : null}
        </aside>

        <main className="flex flex-col px-5 py-8 sm:px-10">
          <p className="text-lg font-bold text-clinic-deep lg:hidden">{b?.name ?? 'Your clinic'}</p>
          <div className="my-auto w-full max-w-[400px] self-center py-10">{children}</div>
        </main>
      </div>
    </RedirectIfAuthenticated>
  );
}
