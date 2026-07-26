"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";

interface KpiData {
  engagement_rate: number;
  reach_rate: number;
  save_rate: number;
  share_rate: number;
  comment_rate: number;
  impressions_to_reach_ratio: number;
  health_score: number;
  health_breakdown: {
    engagement_score: number;
    reach_score: number;
    consistency_score: number;
    diversity_score: number;
  };
  dominant_category: string;
}

interface BenchmarkData {
  category: string;
  avg_engagement_rate: number;
  avg_reach_rate: number;
  avg_save_rate: number;
  sample_size: number;
}

interface ShapFeature {
  feature: string;
  contribution: number;
  direction: string;
}

interface Post {
  post_id: string;
  date: string;
  media_type: string;
  performance_level: number;
  performance_label: string;
  anomaly_flag: boolean;
  shap_explanation: string;
  top_shap_features: ShapFeature[];
}

// performance level 1-5 -> color classes
function levelColor(level: number): string {
  if (level === 1) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  if (level === 2) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  if (level === 3) return "text-text-muted bg-border-subtle border-border-active";
  if (level === 4) return "text-module-if bg-cyan-500/10 border-cyan-500/20";
  return "text-module-arabert bg-emerald-500/10 border-emerald-500/20";
}

// format decimal as percentage string
function pct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

// compute diff vs benchmark
function benchDiff(value: number, bench: number): { label: string; positive: boolean } {
  const diff = ((value - bench) / bench) * 100;
  const positive = diff >= 0;
  return {
    label: `${positive ? "+" : ""}${diff.toFixed(0)}% ${positive ? "above" : "below"} avg`,
    positive,
  };
}

export default function AnalyticsPage() {
  const { isUnlocked, session } = useSession();

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchAll(session.session_id);
  }, [session]);

  async function fetchAll(sid: string) {
    setIsLoading(true);
    setError(null);
    try {
      const [kpiRes, anomalyRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/kpis/${sid}`),
        fetch(`http://localhost:8000/api/v1/anomalies/${sid}`),
      ]);

      if (!kpiRes.ok) throw new Error(`KPIs failed: ${kpiRes.status}`);
      if (!anomalyRes.ok) throw new Error(`Anomalies failed: ${anomalyRes.status}`);

      const kpiData = await kpiRes.json();
      const anomalyData = await anomalyRes.json();

      // fetch benchmarks for this account's actual dominant content category
      const category = kpiData.dominant_category || "Beauty";
      const benchRes = await fetch(`http://localhost:8000/api/v1/benchmarks/${encodeURIComponent(category)}`);
      const benchData = benchRes.ok ? await benchRes.json() : null;

      setKpis(kpiData);
      setPosts(anomalyData.posts || []);
      setBenchmarks(benchData);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  function togglePost(id: string) {
    setExpandedPost(expandedPost === id ? null : id);
  }

  if (!isUnlocked) return <LockedPage title="Analytics" />;

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-14">

      {/* ===== HEADER ===== */}
      <div className="animate-fade-up">
        <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-3">
          Module — IF + DNN
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight">Analytics</h1>
        {session && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 bg-bg-card border border-border-subtle rounded-full text-xs font-mono text-text-muted">
              {session.account_name}
            </span>
            <span className="px-3 py-1 bg-bg-card border border-border-subtle rounded-full text-xs font-mono text-text-muted">
              {session.total_posts} posts
            </span>
            <span className="px-3 py-1 bg-bg-card border border-border-subtle rounded-full text-xs font-mono text-text-muted">
              {session.date_range.from} → {session.date_range.to}
            </span>
          </div>
        )}
      </div>

      {/* ===== LOADING ===== */}
      {isLoading && (
        <div className="flex items-center gap-3 text-text-muted text-sm font-mono py-10">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading analytics data...
        </div>
      )}

      {/* ===== ERROR ===== */}
      {error && (
        <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.04]">
          <p className="text-rose-400 text-xs font-mono">{error}</p>
        </div>
      )}

      {/* ===== CONTENT ===== */}
      {!isLoading && !error && kpis && (
        <>

          {/* ===== HEALTH SCORE ===== */}
          <section className="animate-fade-in">
            <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-5">
              Account Health
            </p>
            <div className="bg-bg-card border border-border-subtle rounded-xl p-6 flex flex-col md:flex-row gap-8">

              {/* Big score number */}
              <div className="flex flex-col items-center justify-center min-w-[120px]">
                <span
                  className={`font-heading text-7xl font-black ${
                    kpis.health_score >= 70
                      ? "text-module-arabert"
                      : kpis.health_score >= 45
                      ? "text-amber-500"
                      : "text-rose-400"
                  }`}
                >
                  {kpis.health_score}
                </span>
                <span className="text-text-muted text-[10px] font-mono mt-1 tracking-widest uppercase">
                  / 100
                </span>
              </div>

              {/* Breakdown bars */}
              <div className="flex-1 space-y-4 justify-center flex flex-col">
                {Object.entries(kpis.health_breakdown).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-text-secondary text-xs font-mono capitalize">
                        {key.replace("_score", "").replace("_", " ")}
                      </span>
                      <span className="text-text-muted text-xs font-mono">{val}/100</span>
                    </div>
                    <div className="w-full h-1.5 bg-border-subtle rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          val >= 70
                            ? "bg-module-arabert"
                            : val >= 45
                            ? "bg-amber-500"
                            : "bg-rose-400"
                        }`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===== KPI CARDS ===== */}
          <section className="animate-fade-in">
            <div className="flex items-end justify-between mb-5">
              <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase">
                Key Performance Indicators
              </p>
              {benchmarks && (
                <p className="text-[10px] font-mono text-text-muted">
                  Benchmarked against {benchmarks.category} avg ({benchmarks.sample_size.toLocaleString()} posts)
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: "Engagement Rate",     value: kpis.engagement_rate,          bench: benchmarks?.avg_engagement_rate ?? null },
                { label: "Reach Rate",          value: kpis.reach_rate,               bench: benchmarks?.avg_reach_rate ?? null },
                { label: "Save Rate",           value: kpis.save_rate,                bench: benchmarks?.avg_save_rate ?? null },
                { label: "Share Rate",          value: kpis.share_rate,               bench: null },
                { label: "Comment Rate",        value: kpis.comment_rate,             bench: null },
                { label: "Impressions / Reach", value: kpis.impressions_to_reach_ratio, bench: null, raw: true },
              ].map((kpi) => {
                const diff = kpi.bench != null ? benchDiff(kpi.value, kpi.bench) : null;
                return (
                  <div
                    key={kpi.label}
                    className="bg-bg-card border border-border-subtle rounded-xl p-5 hover:border-border-active transition-colors"
                  >
                    <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <p className="font-heading text-3xl font-bold text-text-primary mt-2">
                      {kpi.raw ? kpi.value.toFixed(2) : pct(kpi.value)}
                    </p>
                    {diff ? (
                      <p className={`text-[10px] font-mono mt-2 ${diff.positive ? "text-module-arabert" : "text-rose-400"}`}>
                        {diff.label} · {pct(kpi.bench!)} avg
                      </p>
                    ) : (
                      <p className="text-[10px] font-mono mt-2 text-text-muted">no benchmark</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ===== ANOMALY TABLE ===== */}
          <section className="animate-fade-in pb-16">
            <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-2">
              Isolation Forest — Post Performance
            </p>
            <p className="text-text-secondary text-sm mb-5">
              {posts.length} posts analyzed · Click any row to expand the SHAP explanation
            </p>

            <div className="border border-border-subtle rounded-xl overflow-hidden">

              {/* Header row */}
              <div className="grid grid-cols-[100px_80px_140px_1fr] gap-4 px-5 py-3 bg-bg-card border-b border-border-subtle">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Date</span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Type</span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Performance</span>
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Top Factor</span>
              </div>

              {/* Data rows */}
              {posts.map((post) => (
                <div key={post.post_id}>

                  {/* Clickable row */}
                  <div
                    onClick={() => togglePost(post.post_id)}
                    className={`grid grid-cols-[100px_80px_140px_1fr] gap-4 px-5 py-4 border-b border-border-subtle cursor-pointer transition-colors ${
                      expandedPost === post.post_id
                        ? "bg-bg-hover"
                        : "hover:bg-bg-hover"
                    }`}
                  >
                    <span className="text-text-secondary text-xs font-mono self-center">
                      {post.date}
                    </span>
                    <span className="text-text-muted text-xs font-mono self-center capitalize">
                      {post.media_type}
                    </span>
                    <span className="self-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${levelColor(post.performance_level)}`}>
                        L{post.performance_level} · {post.performance_label}
                      </span>
                    </span>
                    <span className="text-text-muted text-xs font-mono self-center truncate">
                      {post.top_shap_features?.[0]?.feature ?? "—"}
                    </span>
                  </div>

                  {/* Expanded SHAP panel */}
                  {expandedPost === post.post_id && (
                    <div className="px-5 py-5 bg-bg-card border-b border-border-subtle">

                      {/* Plain text explanation */}
                      <p className="text-text-secondary text-xs leading-[1.8] mb-5 max-w-2xl">
                        {post.shap_explanation}
                      </p>

                      {/* SHAP feature bars */}
                      {post.top_shap_features?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-3">
                            Feature Contributions
                          </p>
                          <div className="space-y-2.5 max-w-lg">
                            {post.top_shap_features.map((f) => {
                              const maxC = Math.max(...post.top_shap_features.map((x) => Math.abs(x.contribution)));
                              const w = maxC > 0 ? (Math.abs(f.contribution) / maxC) * 100 : 0;
                              return (
                                <div key={f.feature} className="flex items-center gap-3">
                                  <span className="text-text-muted text-[10px] font-mono w-40 shrink-0 truncate">
                                    {f.feature}
                                  </span>
                                  <div className="flex-1 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${f.direction === "positive" ? "bg-module-arabert" : "bg-rose-400"}`}
                                      style={{ width: `${w}%` }}
                                    />
                                  </div>
                                  <span className={`text-[10px] font-mono w-14 text-right shrink-0 ${f.direction === "positive" ? "text-module-arabert" : "text-rose-400"}`}>
                                    {f.direction === "positive" ? "+" : "-"}{Math.abs(f.contribution).toFixed(3)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </>
      )}

    </div>
  );
}