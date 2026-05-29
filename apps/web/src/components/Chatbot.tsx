import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, User, Cpu } from 'lucide-react';
import { useInvoiceStore } from '../store/invoice.store';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export const Chatbot: React.FC = () => {
  const { invoice } = useInvoiceStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        sender: 'assistant',
        text: 'Hello! I am your InvoiceFlow AI platform assistant. Ask me questions about your ingested invoices, payment terms, or line items.'
      }
    ]);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = { sender: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = 'I could not retrieve enough details to answer that. Ingest a document file first.';
      
      if (invoice) {
        const query = text.toLowerCase();
        
        if (query.includes('total') || query.includes('amount') || query.includes('how much')) {
          reply = `The aggregate total value extracted for this invoice is ${invoice.currency.value} ${invoice.totalAmount.value.toFixed(2)}, featuring a confidence consensus score of ${Math.round(invoice.confidenceScore * 100)}%.`;
        } else if (query.includes('vendor') || query.includes('who sent') || query.includes('issued')) {
          reply = `This document was issued by "${invoice.vendor.value}".`;
        } else if (query.includes('recipient') || query.includes('received') || query.includes('who is it for')) {
          reply = `The recipient designated on this document is "${invoice.recipient.value}".`;
        } else if (query.includes('item') || query.includes('detail') || query.includes('charge') || query.includes('list')) {
          const itemsList = invoice.lineItems.map(item => `• ${item.description}: ${invoice.currency.value} ${item.amount.toFixed(2)}`).join('\n');
          reply = `Here is the breakdown of the parsed line items:\n${itemsList}`;
        } else if (query.includes('number') || query.includes('invoice #')) {
          reply = `The invoice unique identifier is: ${invoice.invoiceNumber.value}.`;
        } else if (query.includes('date')) {
          reply = `This document was dated ${invoice.date.value}, with final payment terms scheduled for ${invoice.dueDate.value}.`;
        } else {
          reply = `I have successfully analyzed the invoice from ${invoice.vendor.value} (Total: ${invoice.currency.value} ${invoice.totalAmount.value}). I can answer details regarding dates, numbers, recipients, or line item breakdowns.`;
        }
      } else {
        reply = 'Please ingest an invoice in the workspace to allow scoped Q&A auditing.';
      }

      setMessages((prev) => [...prev, { sender: 'assistant', text: reply }]);
      setIsTyping(false);
    }, 800);
  };

  const handleChipClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const suggestions = [
    'What is the invoice total?',
    'Who is the designated vendor?',
    'List all item breakdowns',
    'What is the invoice number?'
  ];

  return (
    <div className="flex flex-col h-[520px] rounded-2xl glass-panel border border-slate-800 overflow-hidden">
      {/* 1. Header */}
      <div className="bg-surface-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-200">AI Assistance Workspace</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Scoped Invoice Q&A auditor</p>
          </div>
        </div>
        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
      </div>

      {/* 2. Messages display */}
      <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-surface-950/20">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2.5 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`p-2 rounded-lg border border-slate-800 ${
                msg.sender === 'user' ? 'bg-brand-500/10' : 'bg-surface-900'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-brand-400" /> : <Cpu className="w-4 h-4 text-emerald-400" />}
              </div>
              <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line font-medium ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-slate-100 rounded-tr-none'
                  : 'bg-surface-900 border border-slate-800 text-slate-300 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2.5 max-w-[80%]">
              <div className="p-2 rounded-lg border border-slate-800 bg-surface-900">
                <Cpu className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="p-3 rounded-2xl text-xs bg-surface-900 border border-slate-800 text-slate-400 rounded-tl-none flex space-x-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300" />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 3. Pre-populated Prompt Chips */}
      {messages.length === 1 && !isTyping && (
        <div className="px-6 py-2 flex flex-wrap gap-2 bg-surface-950/20 border-t border-slate-800/40">
          {suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(sug)}
              className="text-[10px] px-2.5 py-1.5 rounded-full glass-panel text-slate-300 hover:text-slate-100 hover:bg-surface-800 border border-slate-800/80 transition duration-150 font-semibold"
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* 4. Inputs Footer Form */}
      <div className="p-4 border-t border-slate-800 bg-surface-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={invoice ? "Ask details about line items..." : "Upload document to initialize chat..."}
            disabled={!invoice}
            className="flex-grow px-4 py-2.5 rounded-lg text-xs text-slate-100 glass-input disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!invoice || !input.trim()}
            className="p-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-slate-100 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
