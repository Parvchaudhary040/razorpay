import React from 'react';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  let displayContent = message.content;
  let toolData: any = null;

  if (!isUser) {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed && typeof parsed === 'object') {
        if ('message' in parsed) {
          displayContent = parsed.message;
        }
        if ('result' in parsed) {
          toolData = parsed.result;
        } else if ('data' in parsed) {
          toolData = parsed.data;
        }
      }
    } catch {
      // Treat as plain text
    }
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 mb-4`}>
      <div className="text-xs text-slate-500 font-medium px-1">
        {isUser ? 'You' : 'Assistant'} • {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-none'
            : 'bg-[#2a2a3e] text-slate-100 border border-slate-800 rounded-tl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-line leading-relaxed">{displayContent}</p>
        
        {!isUser && toolData && Array.isArray(toolData) && toolData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
              🔍 Found Recommendations:
            </div>
            <div className="grid grid-cols-1 gap-3">
              {toolData.slice(0, 3).map((product: any) => (
                <div
                  key={product.id}
                  className="bg-[#1e1e2e] border border-slate-800 rounded-lg p-3 flex items-center justify-between hover:border-slate-700 transition"
                >
                  <div className="pr-2">
                    <div className="text-xs font-bold text-slate-200">{product.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{product.description}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-extrabold text-indigo-400">₹{Number(product.price).toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{product.inventoryCount || product.stock_count || 0} in stock</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};