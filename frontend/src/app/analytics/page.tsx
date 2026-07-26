"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";
import PageHeader from "@/components/PageHeader";
import CircularProgress from "@/components/CircularProgress";

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

function levelColor(level: number): string {
  if (level === 1) return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  if (level === 2) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
  if (level === 3) return "text-text-muted bg-border-subtle border-border-active";
  if (level === 4) return "text-module-if bg-cyan-500/10 border-cyan-500/20";
  return "text-module-arabert bg-emerald-500/10 border-emerald-500/20";
}

function pct(v: number): string {
  return `${(v * 100).toFixed(2)}%`;
}

function benchDiff(value: number, bench: number): { label: string; positive: boolean } {
  const diff = ((value - bench) / bench) * 100;
  const positive = diff >= 0;
  return {
    label: `${positive ? "+" : ""}${diff.toFixed(1)}%`,
    positive,
  };
}

// simple inline icon set for stat cards
function StatIcon({ name }: { name: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "health") return <svg {...common}><path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0112 5.5 5.5 5.5 0 0121.5 12c-2.5 4.65-9.5 9-9.5 9z" /></svg>;
  if (name === "engagement") return <svg {...common}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21l7.78-7.55 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
  if (name === "reach") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/></svg>;
  if (name === "consistency") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>;
  if (name === "diversity") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  return <svg {...common}><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
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

  const anomalyCount = posts.filter((p) => p.anomaly_flag).length;
  const anomalyPct = posts.length > 0 ? (anomalyCount / posts.length) * 100 : 0;

  const engDiff = kpis && benchmarks ? benchDiff(kpis.engagement_rate, benchmarks.avg_engagement_rate) : null;
  const reachDiff = kpis && benchmarks ? benchDiff(kpis.reach_rate, benchmarks.avg_reach_rate) : null;

  const statCards = kpis
    ? [
        { label: "Overall Health", value: `${kpis.health_score}`, sub: "/ 100", ring: kpis.health_score, icon: "health" },
        { label: "Engagement Rate", value: pct(kpis.engagement_rate), sub: engDiff ? `${engDiff.label} vs avg` : "no benchmark", positive: engDiff?.positive, ring: kpis.health_breakdown.engagement_score, icon: "engagement" },
        { label: "Reach Rate", value: pct(kpis.reach_rate), sub: reachDiff ? `${reachDiff.label} vs avg` : "no benchmark", positive: reachDiff?.positive, ring: kpis.health_breakdown.reach_score, icon: "reach" },
        { label: "Consistency", value: `${kpis.health_breakdown.consistency_score}`, sub: "posting regularity", ring: kpis.health_breakdown.consistency_score, icon: "consistency" },
        { label: "Content Diversity", value: `${kpis.health_breakdown.diversity_score}`, sub: "format & category mix", ring: kpis.health_breakdown.diversity_score, icon: "diversity" },
        { label: "Anomalies", value: `${anomalyCount}`, sub: `of ${posts.length} posts`, ring: anomalyPct, icon: "anomaly", color: "var(--color-danger)" },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Analytics"
        right={
          session && (
            <>
              <span className="px-3 py-1 bg-bg-card border border-border-subtle rounded-full text-xs font-mono text-text-muted">
                {session.account_name}
              </span>
              <span className="px-3 py-1 bg-bg-card border border-border-subtle rounded-full text-xs font-mono text-text-muted">
                {session.total_posts} posts
              </span>
            </>
          )
        }
      />

      <div className="px-8 py-8 space-y-10 max-w-[1400px]">

        {isLoading && (
          <div className="flex items-center gap-3 text-text-muted text-sm font-mono py-10">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading analytics data...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.04]">
            <p className="text-rose-400 text-xs font-mono">{error}</p>
          </div>
        )}

        {!isLoading && !error && kpis && (
          <>
            {/* ===== STAT CARDS ===== */}
            <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 animate-fade-in">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-bg-card border border-border-subtle rounded-xl p-4 hover:border-border-active transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-text-muted" style={{ opacity: 0.6 }}>
                      <StatIcon name={card.icon} />
                    </span>
                  </div>
                  <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider mb-1">
                    {card.label}
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <span className="font-heading text-2xl font-bold text-text-primary">{card.value}</span>
                      {card.sub && (
                        <p
                          className="text-[10px] font-mono mt-1"
                          style={{
                            color:
                              card.positive === true
                                ? "var(--color-success)"
                                : card.positive === false
                                ? "var(--color-danger)"
                                : "var(--color-text-muted)",
                          }}
                        >
                          {card.sub}
                        </p>
                      )}
                    </div>
                    <CircularProgress value={card.ring} color={card.color} />
                  </div>
                </div>
              ))}
            </section>

            {/* ===== SECONDARY RATES ===== */}
            <section className="animate-fade-in">
              <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-4">
                Additional Rates
              </p>
              <div className="grid grid-cols-3 gap-4 max-w-2xl">
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                  <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">Save Rate</p>
                  <p className="font-heading text-xl font-bold text-text-primary mt-1">{pct(kpis.save_rate)}</p>
                </div>
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                  <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">Share Rate</p>
                  <p className="font-heading text-xl font-bold text-text-primary mt-1">{pct(kpis.share_rate)}</p>
                </div>
                <div className="bg-bg-card border border-border-subtle rounded-xl p-4">
                  <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">Comment Rate</p>
                  <p className="font-heading text-xl font-bold text-text-primary mt-1">{pct(kpis.comment_rate)}</p>
                </div>
              </div>
            </section>

            {/* ===== ANOMALY TABLE ===== */}
            <section className="animate-fade-in pb-16">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-heading text-lg font-bold text-text-primary">Anomaly Detection</h2>
              </div>
              <p className="text-text-secondary text-sm mb-5">
                {posts.length} posts analyzed · Click any row to expand the SHAP explanation
              </p>

              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <div className="grid grid-cols-[100px_80px_140px_1fr] gap-4 px-5 py-3 bg-bg-card border-b border-border-subtle">
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Date</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Type</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Performance</span>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Top Factor</span>
                </div>

                {posts.map((post) => (
                  <div key={post.post_id}>
                    <div
                      onClick={() => togglePost(post.post_id)}
                      className={`grid grid-cols-[100px_80px_140px_1fr] gap-4 px-5 py-4 border-b border-border-subtle cursor-pointer transition-colors ${
                        expandedPost === post.post_id ? "bg-bg-hover" : "hover:bg-bg-hover"
                      }`}
                    >
                      <span className="text-text-secondary text-xs font-mono self-center">{post.date}</span>
                      <span className="text-text-muted text-xs font-mono self-center capitalize">{post.media_type}</span>
                      <span className="self-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${levelColor(post.performance_level)}`}>
                          L{post.performance_level} · {post.performance_label}
                        </span>
                      </span>
                      <span className="text-text-muted text-xs font-mono self-center truncate">
                        {post.top_shap_features?.[0]?.feature ?? "—"}
                      </span>
                    </div>

                    {expandedPost === post.post_id && (
                      <div className="px-5 py-5 bg-bg-card border-b border-border-subtle">
                        <p className="text-text-secondary text-xs leading-[1.8] mb-5 max-w-2xl">
                          {post.shap_explanation}
                        </p>

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
    </div>
  );
}
