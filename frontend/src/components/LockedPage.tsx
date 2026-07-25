"use client";

import Link from "next/link";
import { useSession } from "@/context/SessionContext";

// Shows a "upload data first" message when page is locked
export default function LockedPage({ title }: { title: string }) {
  const { isUnlocked } = useSession();

  if (isUnlocked) return null; // parent page will render its own content

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-14 h-14 rounded-full bg-bg-card border border-border-subtle flex items-center justify-center mb-5">
        <svg
          className="w-6 h-6 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      </div>
      <h2 className="font-heading text-xl font-semibold text-text-primary">
        {title}
      </h2>
      <p className="text-text-secondary text-sm mt-2 text-center max-w-md">
        Upload your Meta Business Suite CSV first to unlock this page.
      </p>
      <Link
        href="/"
        className="mt-6 px-5 py-2.5 bg-amber-500 text-bg-primary text-sm font-mono font-bold rounded-md hover:bg-amber-400 transition-colors"
      >
        Go to Upload
      </Link>
    </div>
  );
}
