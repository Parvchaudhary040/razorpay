import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useChat } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';
import { useNavigate } from 'react-router-dom';

export const ChatWindow: React.FC = () => {
  const { messages, isLoading, requiresConfirmation, confirmationContext, sendMessage, confirmCheckout } = useChat();
  const { setConfirmation } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleConfirm = async () => {
    const result = await confirmCheckout();
    if (result && result.id) {
      navigate(`/orders/${result.id}`);
    }
  };

  const handleCancel = () => {
    setConfirmation(false, null);
  };

  const summaryText = confirmationContext?.summary || 'Items in Cart';
  const totalAmount = confirmationContext?.totalAmount || 0;

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="bg-[#1a1a26] border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
          <h2 className="text-sm font-bold text-slate-200 font-mono pl-2">CommerceAI Agent Supervisor</h2>
        </div>
        <span className="text-xs text-slate-500">Gemini Pro AI Layer</span>
      </div>

      <div className="flex-grow overflow-y-auto p-6 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 max-w-sm mx-auto space-y-4">
            <span className="text-5xl">🤖</span>
            <h3 className="text-base font-bold text-slate-300">Welcome to CommerceAI</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              I am your AI shopping assistant. Ask me to search products, compare specs, add items to cart, or place checkout orders.
            </p>
            <div className="text-left w-full bg-[#1a1a26]/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Suggested Queries</span>
              <button onClick={() => sendMessage('Find me a laptop under ₹70,000 with 16GB RAM.')} className="w-full text-left text-[11px] text-slate-300 hover:text-indigo-400 block truncate transition">
                ⚡ "Find me a laptop under ₹70,000..."
              </button>
              <button onClick={() => sendMessage('Compare premium headphones.')} className="w-full text-left text-[11px] text-slate-300 hover:text-indigo-400 block truncate transition">
                ⚡ "Compare premium headphones..."
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium italic mt-2 animate-pulse">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-75"></span>
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
            </div>
            <span>Assistant is thinking...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <ChatInput onSend={(text) => sendMessage(text)} disabled={isLoading} />

      {requiresConfirmation && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#242438] border border-indigo-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>⚠️</span> Confirm Purchase
              </h3>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-200 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-400 leading-relaxed max-h-36 overflow-y-auto bg-slate-900/40 p-3 rounded-lg border border-slate-800/60 font-mono whitespace-pre-line">
                {summaryText}
              </div>

              <div className="flex justify-between items-center bg-indigo-500/10 p-3.5 rounded-xl border border-indigo-500/20">
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wide">Total Order Amount</span>
                <span className="text-lg font-black text-indigo-200">
                  ₹{Number(totalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/25 transition"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};