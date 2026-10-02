export const queryKeys = {
  business: ['business'] as const,
  services: ['services'] as const,
  appointments: (scope?: 'upcoming' | 'history') => (scope ? (['appointments', scope] as const) : (['appointments'] as const)),
  availability: (serviceId?: string | null, date?: string | null) =>
    serviceId && date ? (['availability', serviceId, date] as const) : (['availability'] as const),
  sessions: ['chat', 'sessions'] as const,
  messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
};
