"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";

// Nav items — locked ones need session_id to access
const NAV_ITEMS = [
  { label: "Upload", path: "/", locked: false, icon: "U" },
  { label: "Analytics", path: "/analytics", locked: true, icon: "A" },
  { label: "Insights", path: "/insights", locked: true, icon: "I" },
  { label: "Simulate", path: "/simulate", locked: true, icon: "S" },
  { label: "Chatbot", path: "/chatbot", locked: true, icon: "C" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isUnlocked, session } = useSession();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-bg-sidebar border-r border-border-subtle flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border-subtle">
        <Link href="/" className="block">
          <h1 className="font-heading text-xl font-bold tracking-tight text-text-primary">
            Insight<span className="text-amber-500">AI</span>
          </h1>
          <p className="text-[10px] font-mono text-text-muted mt-1 tracking-widest uppercase">
            Marketing Intelligence
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const isLocked = item.locked && !isUnlocked;

          return (
            <NavLink
              key={item.path}
              item={item}
              isActive={isActive}
              isLocked={isLocked}
            />
          );
        })}
      </nav>

      {/* Session indicator */}
      {session && (
        <div className="px-4 py-3 border-t border-border-subtle">
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            Active Session
          </p>
          <p className="text-xs font-mono text-amber-500 mt-1 truncate">
            {session.account_name}
          </p>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">
            {session.total_posts} posts
          </p>
        </div>
      )}

      {/* Pipeline "?" button */}
      <div className="px-3 py-4 border-t border-border-subtle">
        <Link
          href="/pipeline"
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-mono transition-colors ${
            pathname === "/pipeline"
              ? "bg-bg-hover text-amber-500"
              : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
          }`}
        >
          <span className="w-6 h-6 rounded-full border border-text-muted flex items-center justify-center text-xs">
            ?
          </span>
          <span>How It Works</span>
        </Link>
      </div>
    </aside>
  );
}

// Individual nav link component
function NavLink({
  item,
  isActive,
  isLocked,
}: {
  item: (typeof NAV_ITEMS)[number];
  isActive: boolean;
  isLocked: boolean;
}) {
  // Base styles
  let className =
    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-colors ";

  if (isActive) {
    className += "bg-bg-hover text-amber-500 border-l-2 border-amber-500";
  } else if (isLocked) {
    className += "text-text-muted cursor-not-allowed opacity-40";
  } else {
    className += "text-text-secondary hover:text-text-primary hover:bg-bg-hover";
  }

  // Locked pages — don't navigate, just show disabled
  if (isLocked) {
    return (
      <div className={className}>
        <span className="w-6 h-6 rounded bg-border-subtle flex items-center justify-center text-[10px] text-text-muted">
          {item.icon}
        </span>
        <span>{item.label}</span>
        <LockIcon />
      </div>
    );
  }

  return (
    <Link href={item.path} className={className}>
      <span
        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${
          isActive
            ? "bg-amber-500/20 text-amber-500"
            : "bg-border-subtle text-text-muted"
        }`}
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

// Simple lock icon (SVG)
function LockIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 ml-auto text-text-muted"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
