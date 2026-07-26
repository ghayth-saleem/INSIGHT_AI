'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useSession } from '@/context/SessionContext';
import LockedPage from '@/components/LockedPage';

// --- Types ---

type ForecastRow = {
  date: string;
  predicted_reach: number;
  lower: number;
  upper: number;
};

type ProphetData = {
  trend_direction: string;
  trend_summary: string;
  best_day: string;
  best_hour: number;
  weekly_seasonality: Record<string, number>;
  forecast_7_days: ForecastRow[];
  confidence_level: string;
};

type SentimentPost = {
  post_id: string;
  caption_preview: string;
  sentiment: string;
  sentiment_score: number;
  engagement_rate: number;
  writing_style: string;
};

type SentimentData = {
  available: boolean;
  posts: SentimentPost[];
  summary: {
    positive_avg_er: number;
    negative_avg_er: number;
    neutral_avg_er: number;
    best_writing_style: string;
    insight: string;
  };
};

type PlanAction = { type: string; action: string; priority: string };
type PlanWeek   = { week: number; focus?: string; actions: PlanAction[] };

type MarketingPlan = {
  plan: PlanWeek[];
  summary: string;
  generated_by: string;
  generation_time_ms: number;
};

// --- Constants ---

const API      = 'http://localhost:8000/api/v1';
const DAYS     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const BAR_MAX  = 96; // tallest bar height in pixels

// --- Helpers ---

function sentimentColor(s: string) {
  if (s === 'Positive') return 'text-module-arabert';
  if (s === 'Negative') return 'text-red-400';
  return 'text-text-secondary';
}

function priorityBadge(p: string) {
  if (p === 'high')   return 'font-semibold';
  if (p === 'medium') return '';
  return '';
}

function priorityStyle(p: string): CSSProperties {
  if (p === 'high') return { backgroundColor: 'var(--color-accent-amber)', color: 'var(--color-bg-primary)' };
  if (p === 'medium') return { backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-active)' };
  return { backgroundColor: 'var(--color-bg-hover)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' };
}

// --- Page ---

export default function InsightsPage() {
  const { session, isUnlocked } = useSession();

  const [prophet,   setProphet]   = useState<ProphetData | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [plan,      setPlan]      = useState<MarketingPlan | null>(null);

  const [loadingProphet,   setLoadingProphet]   = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [generatingPlan,   setGeneratingPlan]   = useState(false);

  useEffect(() => {
    if (!isUnlocked || !session) return;

    // always fetch prophet on mount
    setLoadingProphet(true);
    fetch(`${API}/prophet/${session.session_id}`)
      .then(r => r.json())
      .then(d => { setProphet(d); console.log('prophet loaded', d); })
      .catch(e => console.log('prophet error', e))
      .finally(() => setLoadingProphet(false));

    // only fetch sentiment if the upload had captions
    if (session.captions_detected) {
      setLoadingSentiment(true);
      fetch(`${API}/sentiment/${session.session_id}`)
        .then(r => r.json())
        .then(d => { setSentiment(d); console.log('sentiment loaded', d); })
        .catch(e => console.log('sentiment error', e))
        .finally(() => setLoadingSentiment(false));
    }
  }, [session, isUnlocked]);

  function handleGeneratePlan() {
    if (!session) return;
    setGeneratingPlan(true);
    setPlan(null);

    fetch(`${API}/marketing-plan/${session.session_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_duration_weeks: 4,
        account_goals: ['increase_reach', 'improve_consistency'],
      }),
    })
      .then(r => r.json())
      .then(d => { setPlan(d); console.log('plan generated', d); })
      .catch(e => console.log('plan error', e))
      .finally(() => setGeneratingPlan(false));
  }

  if (!isUnlocked) return <LockedPage title="Insights" />;

  // scale for bar chart
  const seasonVals = prophet ? Object.values(prophet.weekly_seasonality) : [];
  const maxSeason  = seasonVals.length ? Math.max(...seasonVals) : 1;

  return (
    <div className="min-h-screen bg-bg-primary p-6 md:p-8 space-y-12">

      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="font-syne text-2xl font-bold text-text-primary tracking-tight">
          Insights
        </h1>
        <p className="font-mono text-sm text-text-secondary mt-1">
          Trend forecasting · Caption sentiment · AI marketing plan
        </p>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION 1 — PROPHET
      ═══════════════════════════════════════════ */}
      <section className="space-y-4 animate-fade-up">

        <div className="flex items-center gap-3">
          <span className="w-px h-6 rounded-full bg-module-prophet" />
          <h2 className="font-syne text-lg font-bold text-module-prophet">Trend Forecasting</h2>
          <span className="font-mono text-xs text-text-muted">Prophet</span>
        </div>

        {loadingProphet && (
          <p className="font-mono text-sm text-text-secondary animate-pulse">Loading forecast...</p>
        )}

        {!loadingProphet && !prophet && (
          <p className="font-mono text-sm text-text-muted">Forecast data unavailable.</p>
        )}

        {!loadingProphet && prophet && (
          <div className="space-y-4">

            {/* Three summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-2">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Trend Direction
                </p>
                <p
                  className="font-syne text-2xl font-bold"
                  style={{ color: prophet.trend_direction === 'growing' ? 'var(--color-success)' : 'var(--color-danger)' }}
                >
                  {prophet.trend_direction === 'growing' ? '↑ Growing' : '↓ Declining'}
                </p>
                <p className="text-text-secondary text-xs leading-relaxed">{prophet.trend_summary}</p>
                <p className="font-mono text-xs text-text-muted">
                  Confidence:{' '}
                  <span className="text-text-secondary capitalize">{prophet.confidence_level}</span>
                </p>
              </div>

              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-2">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Best Day to Post
                </p>
                <p className="font-syne text-2xl font-bold text-module-prophet">{prophet.best_day}</p>
                <p className="text-text-secondary text-xs">
                  Highest average engagement day based on 12 months of seasonal data.
                </p>
              </div>

              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-2">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  Best Hour to Post
                </p>
                <p className="font-syne text-2xl font-bold text-module-prophet">
                  {String(prophet.best_hour).padStart(2, '0')}:00
                </p>
                <p className="text-text-secondary text-xs">
                  Optimal posting window for maximum reach and engagement.
                </p>
              </div>

            </div>

            {/* Weekly engagement bar chart */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5">
              <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-6">
                Weekly Engagement Pattern
              </p>
              {/* flex items-end: all bars align to the same bottom baseline */}
              <div className="flex items-end gap-2">
                {DAYS.map(day => {
                  const val  = prophet.weekly_seasonality[day] ?? 0;
                  const barH = Math.max(Math.round((val / maxSeason) * BAR_MAX), 4);
                  const isMax = day.toLowerCase() === prophet.best_day.toLowerCase();
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1">
                      <span className="font-mono text-xs text-text-muted leading-none">
                        {(val * 100).toFixed(1)}%
                      </span>
                      <div
                        className="w-full rounded-t-sm transition-all duration-300"
                        style={{
                          height: `${barH}px`,
                          backgroundColor: isMax ? 'var(--color-danger)' : 'var(--color-border-active)',
                        }}
                      />
                      <span
                        className="font-mono text-xs leading-none"
                        style={{ color: isMax ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
                      >
                        {day.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 7-day forecast table */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5">
              <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
                7-Day Reach Forecast
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="font-mono text-xs text-text-muted pb-3 font-normal text-left">Date</th>
                      <th className="font-mono text-xs text-text-muted pb-3 font-normal text-right">Predicted</th>
                      <th className="font-mono text-xs text-text-muted pb-3 font-normal text-right">Lower</th>
                      <th className="font-mono text-xs text-text-muted pb-3 font-normal text-right">Upper</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prophet.forecast_7_days.map((row, i) => (
                      <tr key={i} className="border-b border-border-subtle last:border-0">
                        <td className="py-3 font-mono text-xs text-text-secondary">{row.date}</td>
                        <td className="py-3 font-mono text-sm font-bold text-module-prophet text-right">
                          {row.predicted_reach.toLocaleString()}
                        </td>
                        <td className="py-3 font-mono text-xs text-text-muted text-right">
                          {row.lower.toLocaleString()}
                        </td>
                        <td className="py-3 font-mono text-xs text-text-muted text-right">
                          {row.upper.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 2 — ARABERT (conditional)
      ═══════════════════════════════════════════ */}
      {session?.captions_detected && (
        <section className="space-y-4 animate-fade-up">

          <div className="flex items-center gap-3">
            <span className="w-px h-6 rounded-full bg-module-arabert" />
            <h2 className="font-syne text-lg font-bold text-module-arabert">Caption Sentiment</h2>
            <span className="font-mono text-xs text-text-muted">AraBERT</span>
          </div>

          {loadingSentiment && (
            <p className="font-mono text-sm text-text-secondary animate-pulse">Analyzing captions...</p>
          )}

          {!loadingSentiment && sentiment && sentiment.available && (
            <div className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Key insight card */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-3">
                  <p className="font-mono text-xs text-text-muted uppercase tracking-widest">Key Insight</p>
                  <p className="text-text-primary text-sm leading-relaxed">{sentiment.summary.insight}</p>
                  <div className="flex gap-6 pt-1">
                    <div>
                      <p className="font-mono text-xs text-text-muted">Positive avg ER</p>
                      <p className="font-mono text-sm font-bold text-module-arabert">
                        {(sentiment.summary.positive_avg_er * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-text-muted">Negative avg ER</p>
                      <p className="font-mono text-sm font-bold text-red-400">
                        {(sentiment.summary.negative_avg_er * 100).toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs text-text-muted">Neutral avg ER</p>
                      <p className="font-mono text-sm font-bold text-text-secondary">
                        {(sentiment.summary.neutral_avg_er * 100).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Best writing style card */}
                <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-3">
                  <p className="font-mono text-xs text-text-muted uppercase tracking-widest">Best Writing Style</p>
                  <span
                    className="inline-block font-mono text-sm font-semibold text-module-arabert px-4 py-2 rounded-full"
                    style={{
                      border: '1px solid rgba(52,211,153,0.4)',
                      background: 'rgba(52,211,153,0.08)',
                    }}
                  >
                    {sentiment.summary.best_writing_style}
                  </span>
                  <p className="text-text-secondary text-xs">
                    Captions in this style consistently outperform others on your account.
                  </p>
                </div>

              </div>

              {/* Per-post sentiment table */}
              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
                  Per-Post Sentiment
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-subtle">
                        <th className="font-mono text-xs text-text-muted pb-3 font-normal text-left pr-4">Caption Preview</th>
                        <th className="font-mono text-xs text-text-muted pb-3 font-normal text-left pr-4">Style</th>
                        <th className="font-mono text-xs text-text-muted pb-3 font-normal text-center pr-4">Sentiment</th>
                        <th className="font-mono text-xs text-text-muted pb-3 font-normal text-right pr-4">Score</th>
                        <th className="font-mono text-xs text-text-muted pb-3 font-normal text-right">ER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentiment.posts.map((post, i) => (
                        <tr
                          key={i}
                          className="border-b border-border-subtle last:border-0 hover:bg-bg-hover transition-colors"
                        >
                          <td className="py-3 pr-4 max-w-xs">
                            {/* dir=auto lets the browser decide RTL vs LTR for Arabic/English */}
                            <span
                              className="block truncate font-mono text-xs text-text-secondary"
                              dir="auto"
                            >
                              {post.caption_preview}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-text-muted whitespace-nowrap">
                            {post.writing_style}
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <span className={`font-mono text-xs font-semibold ${sentimentColor(post.sentiment)}`}>
                              {post.sentiment}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs text-text-muted text-right">
                            {(post.sentiment_score * 100).toFixed(0)}%
                          </td>
                          <td className="py-3 font-mono text-xs font-semibold text-module-arabert text-right">
                            {(post.engagement_rate * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {!loadingSentiment && (!sentiment || !sentiment.available) && (
            <p className="font-mono text-sm text-text-muted">No caption data available for analysis.</p>
          )}

        </section>
      )}

      {/* ═══════════════════════════════════════════
          SECTION 3 — MARKETING PLAN
      ═══════════════════════════════════════════ */}
      <section className="space-y-4 animate-fade-up">

        <div className="flex items-center gap-3">
          <span className="w-px h-6 rounded-full bg-amber-500" />
          <h2 className="font-syne text-lg font-bold text-amber-500">Marketing Plan</h2>
        </div>

        {/* Pre-generation prompt */}
        {!plan && (
          <div className="bg-bg-card border border-border-subtle rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <p className="text-text-secondary text-sm max-w-md">
              Generate a personalized one-month (4-week) marketing plan built from your trend data,
              sentiment scores, and anomaly analysis — each week has a clear focus and concrete actions.
            </p>
            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="px-8 py-2.5 rounded-xl font-mono text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--color-accent-amber)', color: 'var(--color-bg-primary)' }}
            >
              {generatingPlan ? '▸ Generating...' : '▸ Generate Marketing Plan'}
            </button>
            {generatingPlan && (
              <p className="font-mono text-xs text-text-muted animate-pulse">
                Generating your one-month plan. This may take up to a minute...
              </p>
            )}
          </div>
        )}

        {/* Plan output */}
        {plan && (
          <div className="space-y-4">

            {/* Executive summary */}
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-2">
              <p className="font-mono text-xs text-text-muted uppercase tracking-widest">Executive Summary</p>
              <p className="text-text-primary text-sm leading-relaxed">{plan.summary}</p>
              <p className="font-mono text-xs text-text-muted pt-1">
                Generated by {plan.generated_by} · {plan.generation_time_ms.toLocaleString()}ms
              </p>
            </div>

            {/* Week blocks */}
            {plan.plan.map(week => (
              <div key={week.week} className="bg-bg-card border border-border-subtle rounded-2xl p-5">
                <div className="flex items-baseline gap-3 mb-4">
                  <p className="font-syne text-sm font-bold text-amber-500">Week {week.week}</p>
                  {week.focus && (
                    <p className="text-text-secondary text-xs">{week.focus}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {week.actions.map((action, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl p-3 bg-bg-hover">
                      <span
                        className={`shrink-0 text-xs font-mono px-2 py-0.5 rounded mt-0.5 ${priorityBadge(action.priority)}`}
                        style={priorityStyle(action.priority)}
                      >
                        {action.priority}
                      </span>
                      <div>
                        <p className="font-mono text-xs text-text-muted">{action.type}</p>
                        <p className="text-text-primary text-sm mt-0.5">{action.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="font-mono text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40"
            >
              ↺ Regenerate plan
            </button>

          </div>
        )}

      </section>

    </div>
  );
}