'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import LockedPage from '@/components/LockedPage';
import PageHeader from '@/components/PageHeader';

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

function BotAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ background: 'var(--color-accent-amber)', color: 'var(--color-bg-primary)' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        <path d="M8 10h0" /><path d="M12 10h0" /><path d="M16 10h0" />
      </svg>
    </div>
  );
}

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
    <div className="h-screen flex flex-col overflow-hidden">

      <PageHeader
        title="Chatbot"
        right={
          <div className="flex flex-wrap gap-2 justify-end">
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
        }
      />

      {/* Messages area — scrollable middle */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex items-start gap-3 animate-fade-in max-w-2xl">
            <BotAvatar />
            <div className="bg-bg-card border border-border-subtle rounded-2xl px-5 py-4 space-y-3">
              <p className="text-text-primary text-sm leading-relaxed">
                Ask anything about your social media performance. Choose a suggested
                question below or type your own.
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="font-mono text-xs px-3 py-1.5 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-active)' }}
                  >
                    &quot;{q}&quot;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-fade-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' && <BotAvatar />}
            <div
              className="max-w-[70%] rounded-2xl px-4 py-3"
              style={
                msg.role === 'user'
                  ? { backgroundColor: 'var(--color-accent-amber)', color: 'var(--color-bg-primary)' }
                  : { backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }
              }
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: msg.role === 'user' ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)' }}
                dir="auto"
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
          <div className="flex items-start gap-3 animate-fade-in">
            <BotAvatar />
            <div className="bg-bg-card border border-border-subtle rounded-2xl px-5 py-4">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent-amber)', animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent-amber)', animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--color-accent-amber)', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Bottom bar — input */}
      <div className="shrink-0 px-8 pb-6 pt-3 border-t border-border-subtle space-y-2">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Query dataset..."
            dir="auto"
            disabled={loading}
            className="flex-1 bg-bg-hover border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-active disabled:opacity-50"
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
        <div className="flex justify-between">
          <span className="font-mono text-[10px] text-text-muted">Shift + Enter for new line</span>
          <span className="font-mono text-[10px] text-text-muted flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            End-to-end encrypted
          </span>
        </div>
      </div>
    </div>
  );
}