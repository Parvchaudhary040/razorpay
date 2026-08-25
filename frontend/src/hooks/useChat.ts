import { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatApi } from '../services/chatApi';
import { ChatMessage } from '../types';

export const useChat = () => {
  const {
    messages,
    isLoading,
    requiresConfirmation,
    confirmationContext,
    addMessage,
    setLoading,
    setConfirmation,
    clearChat,
  } = useChatStore();
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string, agent?: string) => {
    setError(null);
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(content, agent);
      const { message, result, intent, requiresConfirmation: reqConfirm, confirmationContext: confirmContext } = res;
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        toolResults: result ? [{ toolName: intent, result }] : undefined,
      };
      
      addMessage(assistantMsg);
      setConfirmation(!!reqConfirm, confirmContext);
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Failed to get response from AI assistant';
      setError(errMsg);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: `Error: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMsg);
    } finally {
      setLoading(false);
    }
  };

  const confirmCheckout = async () => {
    setError(null);
    setLoading(true);
    
    const confirmUserMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: 'Confirm purchase',
      timestamp: new Date().toISOString(),
    };
    addMessage(confirmUserMsg);

    try {
      const res = await chatApi.confirmCheckout();
      const { message, result } = res;
      
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString(),
        toolResults: result ? [{ toolName: 'create_order', result }] : undefined,
      };

      addMessage(assistantMsg);
      setConfirmation(false, null);
      return result;
    } catch (err: any) {
      const errMsg = err.response?.data?.error?.message || 'Checkout confirmation failed';
      setError(errMsg);
      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: `Checkout failed: ${errMsg}`,
        timestamp: new Date().toISOString(),
      };
      addMessage(assistantMsg);
      setConfirmation(false, null);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    requiresConfirmation,
    confirmationContext,
    error,
    sendMessage,
    confirmCheckout,
    clearChat,
  };
};
