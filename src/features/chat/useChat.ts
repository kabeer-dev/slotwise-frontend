'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { upsertMessage, upsertSession } from '@/lib/chatCache';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtime } from '@/lib/realtime';
import type { ChatMessage, ChatSession, SendMessageResponse } from '@/lib/types';

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  // Fallback for non-secure contexts (plain http on a LAN IP).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Conversation list + which one is open. Opens the latest, or starts one if there are none. */
export function useConversations() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const autoCreated = useRef(false);

  const sessions = useQuery({ queryKey: queryKeys.sessions, queryFn: api.chat.sessions });

  const create = useMutation({
    mutationFn: api.chat.createSession,
    onSuccess: ({ session, messages }) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.sessions, (old) => upsertSession(old, session));
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(session.id), messages);
      setActiveId(session.id);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not start a conversation'),
  });

  useEffect(() => {
    if (activeId || !sessions.isSuccess) return;
    const latest = sessions.data[0];
    if (latest) setActiveId(latest.id);
    else if (!autoCreated.current) {
      autoCreated.current = true; // guards against StrictMode double-invocation
      create.mutate();
    }
  }, [activeId, sessions.isSuccess, sessions.data, create]);

  return {
    sessions: sessions.data ?? [],
    sessionsError: sessions.error,
    activeId,
    active: sessions.data?.find((s) => s.id === activeId) ?? null,
    select: setActiveId,
    startNew: () => create.mutate(),
    starting: create.isPending,
  };
}

/** Messages of one conversation, with optimistic sending and idempotent retries. */
export function useChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const { typingSessions } = useRealtime();

  const messages = useQuery({
    queryKey: queryKeys.messages(sessionId ?? 'none'),
    queryFn: () => api.chat.messages(sessionId!).then((r) => r.messages),
    enabled: Boolean(sessionId),
    // Socket pushes keep this fresh; a reconnect invalidates it.
    staleTime: Infinity,
  });

  const applyResponse = useCallback(
    (res: SendMessageResponse) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(res.session.id), (old) =>
        upsertMessage(upsertMessage(old, res.userMessage), res.assistantMessage),
      );
      queryClient.setQueryData<ChatSession[]>(queryKeys.sessions, (old) => upsertSession(old, res.session));
    },
    [queryClient],
  );

  const send = useMutation({
    mutationFn: (v: { sessionId: string; content: string; clientMessageId: string }) =>
      api.chat.send(v.sessionId, v.content, v.clientMessageId),
    onMutate: (v) => {
      const optimistic: ChatMessage = {
        id: `temp-${v.clientMessageId}`,
        sessionId: v.sessionId,
        role: 'user',
        content: v.content,
        payload: null,
        clientMessageId: v.clientMessageId,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(v.sessionId), (old) => upsertMessage(old, optimistic));
    },
    onSuccess: applyResponse,
    onError: (err, v) => {
      // Already stored by an earlier attempt: just resync.
      if (err instanceof ApiError && err.code === 'DUPLICATE_MESSAGE') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages(v.sessionId) });
        return;
      }
      const reason = err instanceof ApiError ? err.message : 'Message not sent';
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(v.sessionId), (old) =>
        old?.map((m) => (m.id === `temp-${v.clientMessageId}` ? { ...m, pending: false, failed: reason } : m)),
      );
    },
  });

  const confirm = useMutation({
    mutationFn: (sid: string) => api.chat.confirm(sid),
    onSuccess: applyResponse,
    onError: (err, sid) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not confirm the booking');
      void queryClient.invalidateQueries({ queryKey: queryKeys.messages(sid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
  });

  const busy = send.isPending || confirm.isPending;

  return {
    messages: messages.data ?? [],
    loading: messages.isLoading,
    error: messages.error,
    reload: () => void messages.refetch(),
    /** True while the assistant is working on a reply (this tab or another). */
    assistantTyping: busy || (sessionId ? typingSessions.has(sessionId) : false),
    busy,
    send: (content: string) => {
      if (!sessionId || busy) return;
      send.mutate({ sessionId, content, clientMessageId: uuid() });
    },
    /** Re-send with the same clientMessageId so the server can de-duplicate. */
    retry: (message: ChatMessage) => {
      if (!sessionId || busy || !message.clientMessageId) return;
      send.mutate({ sessionId, content: message.content, clientMessageId: message.clientMessageId });
    },
    confirmBooking: () => sessionId && confirm.mutate(sessionId),
    confirming: confirm.isPending,
  };
}
