'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './auth';
import { upsertMessage, upsertSession } from './chatCache';
import { API_URL } from './config';
import { queryKeys } from './queryKeys';
import type { ChatMessage, ChatSession } from './types';

export type ConnectionStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

interface ServerEvents {
  'chat:message': (e: { sessionId: string; message: ChatMessage }) => void;
  'chat:typing': (e: { sessionId: string; isTyping: boolean }) => void;
  'chat:session': (e: { session: ChatSession }) => void;
  'appointments:changed': (e: { reason: 'created' | 'cancelled'; appointmentId: string }) => void;
}

interface RealtimeContextValue {
  status: ConnectionStatus;
  typingSessions: ReadonlySet<string>;
}

const RealtimeContext = createContext<RealtimeContextValue>({ status: 'offline', typingSessions: new Set() });

/**
 * Keeps the React Query cache in sync with server pushes. Components never
 * touch the socket: they read the cache, and this provider writes into it.
 * REST stays the source of truth — after a reconnect we refetch to catch up
 * on anything missed while offline.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [typingSessions, setTypingSessions] = useState<ReadonlySet<string>>(new Set());
  const token = state.status === 'authenticated' ? state.token : null;

  useEffect(() => {
    if (!token) return;

    const socket: Socket<ServerEvents> = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 10_000,
    });
    let everConnected = false;
    setStatus('connecting');

    socket.on('connect', () => {
      if (everConnected) {
        void queryClient.invalidateQueries({ queryKey: ['chat'] });
        void queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      }
      everConnected = true;
      setStatus('live');
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.on('connect_error', () => setStatus(everConnected ? 'reconnecting' : 'offline'));

    socket.on('chat:message', ({ sessionId, message }) => {
      queryClient.setQueryData<ChatMessage[]>(queryKeys.messages(sessionId), (old) => (old ? upsertMessage(old, message) : old));
    });
    socket.on('chat:typing', ({ sessionId, isTyping }) => {
      setTypingSessions((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(sessionId);
        else next.delete(sessionId);
        return next;
      });
    });
    socket.on('chat:session', ({ session }) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.sessions, (old) => upsertSession(old, session));
    });
    socket.on('appointments:changed', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availability() });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setStatus('offline');
      setTypingSessions(new Set());
    };
  }, [token, queryClient]);

  return <RealtimeContext.Provider value={{ status, typingSessions }}>{children}</RealtimeContext.Provider>;
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
