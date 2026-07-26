'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import LockedPage from '@/components/LockedPage';

// --- Types ---

type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  time_ms?: number;
};

// --- Constants ---

const API = 'http://localhost:8000/api/v1';

const PRESETS = [
  'Why did my best post perform so well?',
  "What is my account's biggest weakness?",
  'What should I post this Friday?',
  'How does my ER compare to the industry?',
  'Which caption style works best for me?',
];

const MODULE_CHIPS = [
  { label: 'IF Scores', color: 'var(--color-module-if)', captionsOnly: false },
  { label: 'DNN Predictions', color: 'var(--color-module-dnn)', captionsOnly: false },
  { label: 'Prophet Forecast', color: 'var(--color-module-prophet)', captionsOnly: false },
  { label: 'AraBERT Sentiment', color: 'var(--color-module-arabert)', captionsOnly: true },
];

// --- Page ---

export default function ChatbotPage() {
  const { session, isUnlocked } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function sendMessage(text: string) {
    if (!text.trim() || !session || loading) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // conversation_history = all prior messages (before this question)
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    fetch(`${API}/chatbot/${session.session_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: text.trim(), conversation_history: history }),
    })
      .then(r => r.json())
      .then(d => {
        const botMsg: Message = {
          role: 'assistant',
          content: d.answer || 'No response received.',
          sources: d.sources_used || [],
          time_ms: d.generation_time_ms || 0,
        };
        setMessages(prev => [...prev, botMsg]);
      })
      .catch(e => {
        console.log('chatbot error', e);
        setMessages(prev => [...prev, {
          role: 'assistant' as const,
          content: 'Failed to get a response. Make sure the backend is running.',
        }]);
      })
      .finally(() => setLoading(false));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  if (!isUnlocked) return <LockedPage title="Chatbot" />;

  return (
    <div className="h-screen bg-bg-primary flex flex-col overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 space-y-3 animate-fade-up">
        <div>
          <h1 className="font-syne text-2xl font-bold text-text-primary tracking-tight">
            Ask Insight<span className="text-amber-500">AI</span>
          </h1>
          <p className="font-mono text-sm text-text-secondary mt-1">
            Ask questions about your account performance. The AI uses all module outputs as context.
          </p>
        </div>

        {/* Context chips — show which modules are loaded */}
        <div className="flex flex-wrap gap-2">
          {MODULE_CHIPS.map(chip => {
            if (chip.captionsOnly && !session?.captions_detected) return null;
            return (
              <span
                key={chip.label}
                className="font-mono text-[10px] px-2.5 py-1 rounded-full border"
                style={{
                  color: chip.color,
                  borderColor: chip.color + '40',
                  backgroundColor: chip.color + '10',
                }}
              >
                {chip.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Messages area — scrollable middle */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full border border-amber-500/30 flex items-center justify-center">
              <span className="text-amber-500 text-lg font-syne font-bold">?</span>
            </div>
            <p className="font-mono text-sm text-text-muted text-center leading-relaxed max-w-sm">
              Ask anything about your social media performance.
              Choose a suggested question below or type your own.
            </p>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-bg-card border border-border-subtle'
              }`}
            >
              <p
                className={`font-mono text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' ? 'text-amber-400' : 'text-text-secondary'
                }`}
              >
                {msg.content}
              </p>

              {/* Sources + generation time for assistant messages */}
              {msg.role === 'assistant' && (msg.sources?.length || msg.time_ms) ? (
                <div className="mt-2 pt-2 border-t border-border-subtle flex flex-wrap items-center gap-2">
                  {msg.sources?.map((src, j) => (
                    <span
                      key={j}
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-bg-hover text-text-muted"
                    >
                      {src.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {msg.time_ms ? (
                    <span className="font-mono text-[10px] text-text-muted ml-auto">
                      {msg.time_ms}ms
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-bg-card border border-border-subtle rounded-2xl px-5 py-4">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom bar — presets + input */}
      <div className="shrink-0 px-6 pb-6 pt-3 border-t border-border-subtle space-y-3">

        {/* Preset questions — shown only when conversation is empty */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="font-mono text-xs px-3 py-1.5 rounded-full border border-border-active text-text-secondary hover:text-amber-500 hover:border-amber-500/40 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Text input + send button */}
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your performance..."
            disabled={loading}
            className="flex-1 bg-bg-hover border border-border-subtle rounded-xl px-4 py-3 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-5 py-3 rounded-xl font-mono text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-accent-amber)', color: 'var(--color-bg-primary)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}