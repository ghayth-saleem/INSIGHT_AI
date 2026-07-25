"use client";

export default function UploadPage() {
  return (
    <div className="max-w-2xl mx-auto mt-16">
      {/* Page header */}
      <h2 className="font-heading text-3xl font-bold tracking-tight">
        Upload Your Data
      </h2>
      <p className="text-text-secondary text-sm mt-2">
        Upload your Meta Business Suite CSV export to get started.
      </p>

      {/* Upload zone placeholder — will be built in Step 2 */}
      <div className="mt-10 border-2 border-dashed border-border-active rounded-lg p-16 flex flex-col items-center justify-center hover:border-amber-500/50 transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center mb-4">
          <svg
            className="w-5 h-5 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <p className="text-text-secondary text-sm">
          Drop your CSV file here or click to browse
        </p>
        <p className="text-text-muted text-xs mt-2">
          Supports Meta Business Suite exports (.csv)
        </p>
      </div>

      {/* Status text — will show processing state in Step 2 */}
      <p className="text-text-muted text-xs mt-6 text-center">
        Upload functionality will be connected in Step 2
      </p>
    </div>
  );
}
