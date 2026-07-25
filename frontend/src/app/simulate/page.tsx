'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/context/SessionContext';
import LockedPage from '@/components/LockedPage';

// --- Types ---

type SimulateResult = {
  predicted_engagement_rate: number;
  confidence_interval: { lower: number; upper: number };
  performance_bucket: string;
  top_contributing_features: Array<{
    feature: string;
    contribution: number;
    direction: string;
  }>;
  plain_explanation: string;
};

type FormData = {
  media_type: string;
  content_category: string;
  traffic_source: string;
  day_of_week: string;
  account_type: string;
  post_hour: number;
  follower_count: number;
  caption_length: number;
  hashtags_count: number;
  has_call_to_action: number;
};

// --- Constants ---

const API = 'http://localhost:8000/api/v1';

const OPTIONS = {
  media_type:       ['reel', 'image', 'carousel'],
  content_category: ['Beauty', 'Fashion', 'Food', 'Fitness', 'Travel', 'Lifestyle', 'Technology', 'Business', 'Entertainment', 'Education'],
  traffic_source:   ['Home Feed', 'Explore', 'Profile', 'Hashtag', 'Stories', 'Direct'],
  day_of_week:      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  account_type:     ['brand', 'creator'],
};

// Defaults match vanillaa.perfume + Prophet best time
const DEFAULTS: FormData = {
  media_type:         'reel',
  content_category:   'Beauty',
  traffic_source:     'Home Feed',
  day_of_week:        'Sunday',
  account_type:       'brand',
  post_hour:          18,
  follower_count:     5200,
  caption_length:     120,
  hashtags_count:     8,
  has_call_to_action: 1,
};

// --- Gauge SVG ---

function GaugeChart({ value, max = 0.15 }: { value: number; max?: number }) {
  const cx = 100, cy = 105, r = 80;
  const fraction = Math.max(0, Math.min(value / max, 1));
  const angleRad  = ((180 - fraction * 180) * Math.PI) / 180;
  const ex = cx + r * Math.cos(angleRad);
  const ey = cy - r * Math.sin(angleRad);

  // Color thresholds
  let gaugeColor = '#ef4444';
  if (value >= 0.06) gaugeColor = '#34d399';
  else if (value >= 0.03) gaugeColor = '#f59e0b';

  return (
    <svg viewBox="0 0 200 130" className="w-60 h-40">
      {/* Background track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="#2a2a3e" strokeWidth="14" strokeLinecap="round"
      />
      {/* Filled arc — skip for near-zero values to avoid degenerate path */}
      {fraction >= 0.01 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
          fill="none" stroke={gaugeColor} strokeWidth="14" strokeLinecap="round"
        />
      )}
      {/* Predicted value */}
      <text
        x={cx} y={cy - 14}
        textAnchor="middle"
        fill={gaugeColor}
        fontSize="26" fontWeight="bold"
        fontFamily="'Space Mono', monospace"
      >
        {(value * 100).toFixed(2)}%
      </text>
      {/* Label */}
      <text
        x={cx} y={cy + 5}
        textAnchor="middle"
        fill="#52525e"
        fontSize="7.5"
        fontFamily="'Space Mono', monospace"
      >
        ENGAGEMENT RATE
      </text>
      {/* Scale labels */}
      <text x={cx - r} y={cy + 20} textAnchor="middle" fill="#52525e" fontSize="7" fontFamily="'Space Mono', monospace">0%</text>
      <text x={cx + r} y={cy + 20} textAnchor="middle" fill="#52525e" fontSize="7" fontFamily="'Space Mono', monospace">{(max * 100).toFixed(0)}%</text>
    </svg>
  );
}

// --- Helpers ---

function bucketColor(bucket: string) {
  if (bucket === 'Viral' || bucket === 'High') return '#34d399';
  if (bucket === 'Average') return '#f59e0b';
  return '#ef4444';
}

// --- Page ---

export default function SimulatePage() {
  const { session, isUnlocked } = useSession();
  const [form,        setForm]        = useState<FormData>(DEFAULTS);
  const [accountAvgEr, setAccountAvgEr] = useState(0.042); // fallback default
  const [result,      setResult]      = useState<SimulateResult | null>(null);
  const [predicting,  setPredicting]  = useState(false);

  // Fetch the real account ER to use as baseline for the DNN
  useEffect(() => {
    if (!isUnlocked || !session) return;
    fetch(`${API}/kpis/${session.session_id}`)
      .then(r => r.json())
      .then(d => {
        if (d.engagement_rate) {
          setAccountAvgEr(d.engagement_rate);
          console.log('account avg er', d.engagement_rate);
        }
      })
      .catch(e => console.log('kpi fetch error', e));
  }, [session, isUnlocked]);

  function setField(key: keyof FormData, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }));
    setResult(null); // clear result when form changes
  }

  function handlePredict() {
    setPredicting(true);
    setResult(null);
    fetch(`${API}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, account_avg_er: accountAvgEr }),
    })
      .then(r => r.json())
      .then(d => { setResult(d); console.log('simulate result', d); })
      .catch(e => console.log('simulate error', e))
      .finally(() => setPredicting(false));
  }

  if (!isUnlocked) return <LockedPage title="Simulate" />;

  const maxContrib = result
    ? Math.max(...result.top_contributing_features.map(f => Math.abs(f.contribution)), 0.0001)
    : 1;

  return (
    <div className="min-h-screen bg-bg-primary p-6 md:p-8 space-y-8">

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-syne text-2xl font-bold text-text-primary tracking-tight">
          What-If Simulator
        </h1>
        <p className="font-mono text-sm text-text-secondary mt-1">
          Configure a hypothetical post and let the DNN predict its engagement rate.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">

        {/* ─── FORM ─── */}
        <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 space-y-5">

          <div className="flex items-center gap-3">
            <span className="w-px h-6 rounded-full bg-module-dnn" />
            <h2 className="font-syne text-base font-bold text-module-dnn">Post Configuration</h2>
            <span className="font-mono text-xs text-text-muted">DNN</span>
          </div>

          {/* Categorical dropdowns — 2 column grid */}
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: 'media_type',       label: 'Media Type'       },
                { key: 'content_category', label: 'Content Category' },
                { key: 'traffic_source',   label: 'Traffic Source'   },
                { key: 'day_of_week',      label: 'Day of Week'      },
                { key: 'account_type',     label: 'Account Type'     },
              ] as Array<{ key: keyof FormData; label: string }>
            ).map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <label className="font-mono text-xs text-text-muted">{label}</label>
                <select
                  value={form[key] as string}
                  onChange={e => setField(key, e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-bg-hover border border-border-subtle rounded-lg px-3 py-2 font-mono text-xs text-text-primary focus:outline-none focus:border-border-active"
                >
                  {OPTIONS[key as keyof typeof OPTIONS].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Numerical sliders */}
          <div className="space-y-4">

            {/* Post hour */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-mono text-xs text-text-muted">Post Hour</label>
                <span className="font-mono text-xs text-module-dnn">
                  {String(form.post_hour).padStart(2, '0')}:00
                </span>
              </div>
              <input
                type="range" min={0} max={23} step={1}
                value={form.post_hour}
                onChange={e => setField('post_hour', parseInt(e.target.value))}
                style={{ accentColor: '#a78bfa' }}
                className="w-full"
              />
            </div>

            {/* Follower count */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-mono text-xs text-text-muted">Follower Count</label>
                <span className="font-mono text-xs text-module-dnn">
                  {form.follower_count.toLocaleString()}
                </span>
              </div>
              <input
                type="range" min={1000} max={100000} step={500}
                value={form.follower_count}
                onChange={e => setField('follower_count', parseInt(e.target.value))}
                style={{ accentColor: '#a78bfa' }}
                className="w-full"
              />
            </div>

            {/* Caption length */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-mono text-xs text-text-muted">Caption Length</label>
                <span className="font-mono text-xs text-module-dnn">{form.caption_length} chars</span>
              </div>
              <input
                type="range" min={0} max={300} step={10}
                value={form.caption_length}
                onChange={e => setField('caption_length', parseInt(e.target.value))}
                style={{ accentColor: '#a78bfa' }}
                className="w-full"
              />
            </div>

            {/* Hashtag count */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="font-mono text-xs text-text-muted">Hashtag Count</label>
                <span className="font-mono text-xs text-module-dnn">{form.hashtags_count}</span>
              </div>
              <input
                type="range" min={0} max={30} step={1}
                value={form.hashtags_count}
                onChange={e => setField('hashtags_count', parseInt(e.target.value))}
                style={{ accentColor: '#a78bfa' }}
                className="w-full"
              />
            </div>

            {/* CTA toggle */}
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs text-text-muted">Has Call to Action</label>
              <button
                onClick={() => setField('has_call_to_action', form.has_call_to_action === 1 ? 0 : 1)}
                className="flex items-center gap-2"
              >
                <span
                  className="w-10 h-5 rounded-full flex items-center transition-all duration-200"
                  style={{
                    backgroundColor: form.has_call_to_action === 1 ? '#a78bfa' : '#2a2a3e',
                    padding: '2px',
                    justifyContent: form.has_call_to_action === 1 ? 'flex-end' : 'flex-start',
                  }}
                >
                  <span className="w-4 h-4 bg-white rounded-full" />
                </span>
                <span
                  className="font-mono text-xs"
                  style={{ color: form.has_call_to_action === 1 ? '#a78bfa' : '#52525e' }}
                >
                  {form.has_call_to_action === 1 ? 'Yes' : 'No'}
                </span>
              </button>
            </div>

          </div>

          {/* Predict button */}
          <button
            onClick={handlePredict}
            disabled={predicting}
            className="w-full py-3 rounded-xl font-mono text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#a78bfa', color: '#07070f' }}
          >
            {predicting ? '▸ Running inference...' : '▸ Predict Engagement Rate'}
          </button>

        </div>

        {/* ─── RESULTS ─── */}
        <div className="space-y-4">

          {/* Empty state */}
          {!result && !predicting && (
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-10 flex flex-col items-center justify-center gap-3 min-h-64">
              <p className="font-mono text-sm text-text-muted text-center leading-relaxed">
                Adjust the parameters on the left and click Predict to run the DNN model.
              </p>
            </div>
          )}

          {/* Loading state */}
          {predicting && (
            <div className="bg-bg-card border border-border-subtle rounded-2xl p-10 flex flex-col items-center justify-center gap-3 min-h-64">
              <p className="font-mono text-sm text-text-secondary animate-pulse">
                Running DNN inference...
              </p>
            </div>
          )}

          {/* Prediction result */}
          {result && (
            <>
              {/* Gauge card */}
              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5 flex flex-col items-center gap-3">
                <GaugeChart value={result.predicted_engagement_rate} />
                <div className="flex items-center gap-4">
                  <span
                    className="font-syne text-lg font-bold"
                    style={{ color: bucketColor(result.performance_bucket) }}
                  >
                    {result.performance_bucket}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    CI: {(result.confidence_interval.lower * 100).toFixed(2)}% – {(result.confidence_interval.upper * 100).toFixed(2)}%
                  </span>
                </div>
                <p className="text-text-secondary text-xs text-center leading-relaxed max-w-sm">
                  {result.plain_explanation}
                </p>
              </div>

              {/* SHAP feature bars */}
              <div className="bg-bg-card border border-border-subtle rounded-2xl p-5">
                <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
                  Top Contributing Features
                </p>
                <div className="space-y-3">
                  {result.top_contributing_features.map((f, i) => {
                    const barWidth = Math.round((Math.abs(f.contribution) / maxContrib) * 100);
                    const isPos    = f.direction === 'positive';
                    const barColor = isPos ? '#34d399' : '#fb7185';
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs text-text-secondary">
                            {f.feature.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-xs font-semibold" style={{ color: barColor }}>
                            {isPos ? '+' : ''}{f.contribution.toFixed(4)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-bg-hover rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}