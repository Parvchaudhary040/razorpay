import React, { useState } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  const handleSuggestionClick = (text: string) => {
    if (disabled) return;
    onSend(text);
  };

  return (
    <div className="p-4 bg-[#1a1a26] border-t border-slate-800">
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => handleSuggestionClick('Show me laptops under ₹80,000')}
          disabled={disabled}
          className="text-xs bg-[#252538] hover:bg-[#2e2e46] text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 transition"
        >
          🔍 Laptops under ₹80,000
        </button>
        <button
          onClick={() => handleSuggestionClick('Compare products')}
          disabled={disabled}
          className="text-xs bg-[#252538] hover:bg-[#2e2e46] text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 transition"
        >
          📊 Compare products
        </button>
        <button
          onClick={() => handleSuggestionClick('View my cart')}
          disabled={disabled}
          className="text-xs bg-[#252538] hover:bg-[#2e2e46] text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 transition"
        >
          🛒 View cart
        </button>
        <button
          onClick={() => handleSuggestionClick('Buy this')}
          disabled={disabled}
          className="text-xs bg-[#252538] hover:bg-[#2e2e46] text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 transition"
        >
          💳 Buy items
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? 'Assistant is thinking...' : 'Ask CommerceAI...'}
          className="flex-grow bg-[#222234] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none placeholder-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-600 font-bold px-6 rounded-xl text-sm transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};