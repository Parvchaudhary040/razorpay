import { create } from 'zustand';
import { ChatMessage } from '../types';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  requiresConfirmation: boolean;
  confirmationContext: any;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  setLoading: (isLoading: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  setConfirmation: (requiresConfirmation: boolean, context?: any) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  sessionId: null,
  requiresConfirmation: false,
  confirmationContext: null,
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionId: (sessionId) => set({ sessionId }),
  setConfirmation: (requiresConfirmation, context = null) => set({ requiresConfirmation, confirmationContext: context }),
  clearChat: () => set({ messages: [], isLoading: false, sessionId: null, requiresConfirmation: false, confirmationContext: null }),
}));