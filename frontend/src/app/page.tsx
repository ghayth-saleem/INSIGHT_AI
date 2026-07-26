"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import PageHeader from "@/components/PageHeader";

const TUTORIAL_STEPS = [
  {
    step: "1",
    title: "Open Meta Business Suite",
    desc: "Go to business.facebook.com and log in with the account linked to your Instagram page.",
  },
  {
    step: "2",
    title: "Navigate to Insights",
    desc: "From the left sidebar, click on Insights to open your performance dashboard.",
  },
  {
    step: "3",
    title: "Select the Content Tab",
    desc: "At the top of the Insights page, click the Content tab to see all published posts.",
  },
  {
    step: "4",
    title: "Click Export Data",
    desc: "Look for the Export button in the top-right corner of the content table.",
  },
  {
    step: "5",
    title: "Choose Range & Format",
    desc: "Select at least 30 days of data, pick CSV as the format, and click Export.",
  },
  {
    step: "6",
    title: "Upload to InsightAI",
    desc: "Drag the downloaded CSV file into the upload zone below, or click Select File.",
  },
];

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { setSession } = useSession();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

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
    <div>
      <PageHeader title="Upload" />

      <div className="max-w-3xl mx-auto px-6 py-10">

        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-extrabold tracking-tight">
            Upload Your Instagram Data
          </h1>
          <p className="text-text-secondary text-sm mt-3 max-w-lg mx-auto leading-relaxed">
            Drop your Meta Business Suite CSV export here to begin deep anomaly
            detection and performance forecasting.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileInputChange}
        />

        {/* SUCCESS STATE */}
        {uploadResult && (
          <div className="border border-border-subtle rounded-2xl bg-bg-card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--color-success)", opacity: 0.15 }}>
                <svg className="w-3 h-3" style={{ color: "var(--color-success)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-mono" style={{ color: "var(--color-success)" }}>Analysis complete — data processed successfully</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-primary">
                <p className="text-[10px] font-mono text-text-muted tracking-[0.2em] uppercase mb-2">Account</p>
                <p className="font-heading text-lg font-bold text-text-primary truncate">
                  {uploadResult.account_name || "—"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-primary">
                <p className="text-[10px] font-mono text-text-muted tracking-[0.2em] uppercase mb-2">Posts Analyzed</p>
                <p className="font-heading text-lg font-bold text-text-primary">
                  {uploadResult.total_posts ?? "—"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-primary">
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
                className="px-8 py-3 rounded-lg font-mono font-bold text-sm transition-all duration-200"
                style={{ backgroundColor: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
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
            className="border-2 border-dashed rounded-2xl p-14 flex flex-col items-center justify-center transition-all duration-300"
            style={{
              borderColor: isDragging ? "var(--color-accent-amber)" : "var(--color-border-active)",
              backgroundColor: isDragging ? "rgba(201,155,92,0.04)" : "var(--color-bg-card)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
              style={{
                backgroundColor: isDragging ? "rgba(201,155,92,0.1)" : "var(--color-bg-hover)",
                border: `1px solid ${isDragging ? "var(--color-accent-amber)" : "var(--color-border-subtle)"}`,
              }}
            >
              <svg
                className="w-6 h-6 transition-colors duration-300"
                style={{ color: isDragging ? "var(--color-accent-amber)" : "var(--color-text-muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-text-primary text-base font-bold mb-1">
              {isDragging ? "Release to upload" : "Click or drag file to this area to upload"}
            </p>
            <p className="text-text-muted text-xs mb-5">
              Strictly CSV formats exported from Meta. Max size 50MB.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 rounded-lg font-mono font-bold text-xs tracking-wider uppercase transition-all duration-200"
              style={{ backgroundColor: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
            >
              Select File
            </button>
          </div>
        )}

        {/* FILE SELECTED STATE */}
        {!uploadResult && file && (
          <div className="border border-border-active rounded-2xl p-8 bg-bg-card">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(201,155,92,0.1)", border: "1px solid rgba(201,155,92,0.25)" }}>
                <svg className="w-6 h-6" style={{ color: "var(--color-accent-amber)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                className="px-8 py-3 rounded-lg font-mono font-bold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                style={{ backgroundColor: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
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

        <p className="text-text-muted text-[11px] mt-6 text-center flex items-center justify-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          End-to-end encrypted. Data is processed locally.
        </p>

        {/* ===== TUTORIAL ===== */}
        {!uploadResult && (
          <section className="mt-16 pt-10 border-t border-border-subtle">
            <h2 className="font-heading text-xl font-bold tracking-tight text-center">
              How to Export Your Data
            </h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TUTORIAL_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="p-4 rounded-xl border border-border-subtle bg-bg-card flex gap-3"
                >
                  <span
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold"
                    style={{ backgroundColor: "rgba(201,155,92,0.12)", color: "var(--color-accent-amber)" }}
                  >
                    {step.step}
                  </span>
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-text-primary leading-snug mb-1">
                      {step.title}
                    </h3>
                    <p className="text-text-muted text-xs leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
