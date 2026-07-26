"use client";

import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

const CAPABILITIES = [
  {
    title: "Anomaly Detection",
    desc: "Flag viral spikes and underperforming posts in real-time, with a plain-language explanation for each.",
    tag: "Isolation Forest + DNN",
  },
  {
    title: "Trend Forecasting",
    desc: "Predict the future trajectory of your reach and engagement over the next 7 days.",
    tag: "Prophet",
  },
  {
    title: "Post Simulator",
    desc: "Test before you post. Model the predicted engagement rate of a post before it goes live.",
    tag: "DNN",
  },
];

export default function PipelinePage() {
  const router = useRouter();

  return (
    <div>
      <PageHeader title="How It Works" />

      <div className="px-8 py-12 max-w-5xl">

        {/* Hero */}
        <div className="animate-fade-up">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8"
            style={{ border: "1px solid rgba(130,171,141,0.3)", backgroundColor: "rgba(130,171,141,0.06)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "var(--color-success)" }} />
            <p className="text-[11px] font-mono tracking-[0.2em]" style={{ color: "var(--color-success)" }}>SYSTEM ONLINE</p>
          </div>

          <h1 className="font-heading text-5xl font-extrabold tracking-tight leading-[1.1] max-w-2xl">
            Turn Your Social Data Into{" "}
            <span style={{ color: "var(--color-accent-amber)" }}>Strategy</span>
          </h1>

          <p className="text-text-secondary text-sm mt-6 max-w-lg leading-[1.7]">
            Upload your Instagram analytics and let four independent AI models
            analyze your performance, detect issues, forecast trends, and build
            you a personalized marketing plan — all explained in plain language.
          </p>

          <button
            onClick={() => router.push("/")}
            className="mt-10 px-8 py-3.5 rounded-lg font-mono font-bold text-sm uppercase tracking-wider transition-all duration-200"
            style={{ backgroundColor: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
          >
            Get Started
          </button>
        </div>

        {/* Capabilities */}
        <section className="mt-20 pt-10 border-t border-border-subtle animate-fade-up">
          <h2 className="font-heading text-2xl font-bold tracking-tight mb-1">System Capabilities</h2>
          <p className="text-text-muted text-xs font-mono uppercase tracking-widest mb-8">
            Active analytical modules
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CAPABILITIES.map((cap) => (
              <div key={cap.title} className="bg-bg-card border border-border-subtle rounded-2xl p-6">
                <h3 className="font-heading text-lg font-bold text-text-primary mb-2">{cap.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed mb-4">{cap.desc}</p>
                <span
                  className="inline-block font-mono text-[10px] px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "var(--color-bg-hover)", color: "var(--color-text-muted)", border: "1px solid var(--color-border-active)" }}
                >
                  {cap.tag}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
