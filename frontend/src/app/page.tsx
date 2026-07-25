"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

const TUTORIAL_STEPS = [
  {
    step: "01",
    title: "Open Meta Business Suite",
    desc: "Go to business.facebook.com and log in with the account linked to your Instagram page.",
  },
  {
    step: "02",
    title: "Navigate to Insights",
    desc: "From the left sidebar, click on Insights to open your performance dashboard.",
  },
  {
    step: "03",
    title: "Select the Content Tab",
    desc: "At the top of the Insights page, click the Content tab to see all published posts.",
  },
  {
    step: "04",
    title: "Click Export Data",
    desc: "Look for the Export button in the top-right corner of the content table.",
  },
  {
    step: "05",
    title: "Choose Range & Format",
    desc: "Select at least 30 days of data, pick CSV as the format, and click Export.",
  },
  {
    step: "06",
    title: "Upload to InsightAI",
    desc: "Drag the downloaded CSV file into the upload zone below, or click Select File.",
  },
];

export default function HomePage() {
  const uploadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setSession } = useSession();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  function handleFile(f: File) {
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported. Please export from Meta Business Suite.");
      return;
    }
    setError(null);
    setFile(f);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  }

  async function handleUpload() {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("http://localhost:8000/api/v1/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status}`);
      }

      const data = await res.json();
      setSession(data);
      setUploadResult(data);
    } catch (err: any) {
      setError(err.message || "Upload failed. Make sure the backend is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetFile() {
    setFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-4xl mx-auto px-6">

      {/* ===== HERO ===== */}
      <section className="min-h-screen flex flex-col justify-center py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-emerald-500/20 rounded-full mb-10 bg-emerald-500/[0.04] w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[11px] font-mono text-emerald-400 tracking-[0.2em]">SYSTEM ONLINE</p>
        </div>

        <h1 className="font-heading text-6xl font-extrabold tracking-tight leading-[1.08]">
          Turn Your Social Data
          <br />
          Into{" "}
          <span className="text-amber-500 relative">
            Strategy
            <span className="absolute -bottom-1.5 left-0 w-full h-px bg-amber-500/40" />
          </span>
        </h1>

        <p className="text-text-secondary text-sm mt-8 max-w-lg leading-[1.7]">
          Upload your Instagram analytics and let four independent AI models
          analyze your performance, detect issues, forecast trends, and build
          you a personalized marketing plan — all explained in plain language.
        </p>

        <div className="flex items-center gap-5 mt-12">
          <button
            onClick={scrollToUpload}
            className="px-8 py-3.5 bg-amber-500 text-bg-primary font-mono font-bold text-sm rounded-lg hover:bg-amber-400 transition-all duration-200 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] uppercase tracking-wider"
          >
            Get Started
          </button>
          <Link
            href="/pipeline"
            className="px-8 py-3.5 border border-border-active text-text-secondary font-mono text-sm rounded-lg hover:border-amber-500/30 hover:text-text-primary transition-all duration-200 uppercase tracking-wider"
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* ===== TUTORIAL ===== */}
      <section className="py-20 border-t border-border-subtle">
        <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-4">
          Before You Start
        </p>
        <h2 className="font-heading text-3xl font-bold tracking-tight">
          How to Export Your Data from Meta
        </h2>
        <p className="text-text-secondary text-sm mt-3 max-w-md leading-[1.7]">
          Follow these steps to download your Instagram analytics CSV from Meta Business Suite.
        </p>

        <div className="mt-12 grid grid-cols-3 gap-4">
          {TUTORIAL_STEPS.map((step, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-border-subtle bg-bg-card hover:border-amber-500/20 transition-all duration-200"
            >
              <p className="text-[10px] font-mono text-amber-500/60 tracking-[0.2em] mb-3">
                STEP {step.step}
              </p>
              <h3 className="font-heading text-sm font-semibold text-text-primary leading-snug mb-2">
                {step.title}
              </h3>
              <p className="text-text-muted text-xs leading-[1.7]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== UPLOAD ===== */}
      <section ref={uploadRef} id="upload-zone" className="py-20 border-t border-border-subtle pb-32">
        <p className="text-[10px] font-mono text-text-muted tracking-[0.25em] uppercase mb-4">
          Ready to Analyze
        </p>
        <h2 className="font-heading text-3xl font-bold tracking-tight">
          Upload Your CSV
        </h2>
        <p className="text-text-secondary text-sm mt-3">
          Drop your Meta Business Suite export below to start.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileInputChange}
        />

        {/* SUCCESS STATE */}
        {uploadResult && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-400 text-sm font-mono">Analysis complete — data processed successfully</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-5 rounded-xl border border-border-subtle bg-bg-card">
                <p className="text-[10px] font-mono text-text-muted tracking-[0.2em] uppercase mb-2">Account</p>
                <p className="font-heading text-lg font-bold text-text-primary truncate">
                  {uploadResult.account_name || "—"}
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border-subtle bg-bg-card">
                <p className="text-[10px] font-mono text-text-muted tracking-[0.2em] uppercase mb-2">Posts Analyzed</p>
                <p className="font-heading text-lg font-bold text-text-primary">
                  {uploadResult.total_posts ?? "—"}
                </p>
              </div>
              <div className="p-5 rounded-xl border border-border-subtle bg-bg-card">
                <p className="text-[10px] font-mono text-text-muted tracking-[0.2em] uppercase mb-2">Date Range</p>
                <p className="font-heading text-sm font-bold text-text-primary">
                  {uploadResult.date_range
                    ? `${uploadResult.date_range.from} to ${uploadResult.date_range.to}`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={() => router.push("/analytics")}
                className="px-8 py-3.5 bg-amber-500 text-bg-primary font-mono font-bold text-sm rounded-lg hover:bg-amber-400 transition-all duration-200 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]"
              >
                View Analytics
              </button>
              <button
                onClick={resetFile}
                className="text-text-muted text-sm font-mono hover:text-text-secondary transition-colors"
              >
                Upload different file
              </button>
            </div>
          </div>
        )}

        {/* IDLE STATE */}
        {!uploadResult && !file && (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`mt-10 border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center transition-all duration-300 ${
              isDragging
                ? "border-amber-500/60 bg-amber-500/[0.04]"
                : "border-border-active hover:border-amber-500/20"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-5 transition-all duration-300 ${
                isDragging
                  ? "border-amber-500/40 bg-amber-500/[0.08]"
                  : "bg-bg-card border-border-subtle"
              }`}
            >
              <svg
                className={`w-7 h-7 transition-colors duration-300 ${isDragging ? "text-amber-500" : "text-text-muted"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm font-mono mb-5">
              {isDragging ? "Release to upload" : "Drag and drop your CSV here"}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-amber-500 text-bg-primary font-mono font-bold text-xs rounded-lg hover:bg-amber-400 transition-all duration-200 tracking-wider uppercase"
            >
              Select File
            </button>
            <p className="text-text-muted text-xs mt-4">
              Supports Meta Business Suite exports (.csv)
            </p>
          </div>
        )}

        {/* FILE SELECTED STATE */}
        {!uploadResult && file && (
          <div className="mt-10 border border-border-active rounded-xl p-8 bg-bg-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-mono font-bold truncate">{file.name}</p>
                <p className="text-text-muted text-xs mt-1">{formatSize(file.size)} · CSV</p>
              </div>
              <button
                onClick={resetFile}
                className="text-text-muted hover:text-text-secondary transition-colors p-1"
                title="Remove"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border-subtle flex items-center gap-4">
              <button
                onClick={handleUpload}
                disabled={isLoading}
                className="px-8 py-3 bg-amber-500 text-bg-primary font-mono font-bold text-sm rounded-lg hover:bg-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] flex items-center gap-3"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  "Analyze with InsightAI"
                )}
              </button>
              {!isLoading && (
                <button
                  onClick={resetFile}
                  className="text-text-muted text-sm font-mono hover:text-text-secondary transition-colors"
                >
                  Choose different file
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg border border-rose-500/20 bg-rose-500/[0.04]">
            <p className="text-rose-400 text-xs font-mono">{error}</p>
          </div>
        )}

        <p className="text-text-muted text-[11px] mt-8 text-center">
          Your data is processed locally — never sent to external servers.
        </p>
      </section>
    </div>
  );
}