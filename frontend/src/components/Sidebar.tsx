"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, minWidth: size, minHeight: size };
  const paths: Record<string, React.ReactNode> = {
    logo: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h7l-1 8 11-14h-7l1-8z" />
      </svg>
    ),
    upload: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
    analytics: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>
      </svg>
    ),
    insights: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"/><circle cx="12" cy="12" r="6"/><path d="M12 18v4"/>
        <path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/>
        <path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
    simulate: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v1m0 16v1m8.66-13.5l-.87.5M4.21 16l-.87.5M20.66 16l-.87-.5M4.21 8l-.87-.5"/>
        <circle cx="12" cy="12" r="4"/><path d="M12 8v4l2 2"/>
      </svg>
    ),
    chatbot: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        <path d="M8 10h0"/><path d="M12 10h0"/><path d="M16 10h0"/>
      </svg>
    ),
    pipeline: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
        <path d="M12 7v4"/><path d="M7.5 17.5L11 13"/><path d="M16.5 17.5L13 13"/>
      </svg>
    ),
  };
  return <>{paths[name] || null}</>;
}

const NAV_ITEMS = [
  { label: "Upload",    path: "/",          icon: "upload",    locked: false },
  { label: "Analytics", path: "/analytics", icon: "analytics", locked: true  },
  { label: "Insights",  path: "/insights",  icon: "insights",  locked: true  },
  { label: "Simulate",  path: "/simulate",  icon: "simulate",  locked: true  },
  { label: "Chatbot",   path: "/chatbot",   icon: "chatbot",   locked: true  },
];

// fixed width, icon-only rail — no hover expand, matches reference design
export const SIDEBAR_WIDTH = 80;

export default function Sidebar() {
  const pathname = usePathname();
  const { isUnlocked } = useSession();

  return (
    <aside
      className="fixed left-0 top-0 h-full z-50 flex flex-col items-center justify-between py-5"
      style={{
        width: SIDEBAR_WIDTH,
        backgroundColor: "var(--color-bg-sidebar)",
        borderRight: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Top: logo mark */}
      <div className="flex flex-col items-center gap-6 w-full">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
          title="Insight AI"
        >
          <Icon name="logo" size={20} />
        </div>

        {/* Nav */}
        <ul className="flex flex-col gap-2 w-full items-center">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            const isLocked = item.locked && !isUnlocked;
            return (
              <NavItem key={item.path} item={item} isActive={isActive} isLocked={isLocked} />
            );
          })}
        </ul>
      </div>

      {/* Bottom: pipeline */}
      <Link
        href="/pipeline"
        title="Pipeline"
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
        style={{ color: "var(--color-text-muted)" }}
      >
        <Icon name="pipeline" size={18} />
      </Link>
    </aside>
  );
}

function NavItem({
  item,
  isActive,
  isLocked,
}: {
  item: (typeof NAV_ITEMS)[number];
  isActive: boolean;
  isLocked: boolean;
}) {
  const icon = <Icon name={item.icon} size={19} />;

  if (isLocked) {
    return (
      <li>
        <div
          title={`${item.label} — upload data to unlock`}
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ color: "var(--color-text-muted)", opacity: 0.35, cursor: "not-allowed" }}
        >
          {icon}
        </div>
      </li>
    );
  }

  if (isActive) {
    return (
      <li>
        <Link
          href={item.path}
          title={item.label}
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "var(--color-accent-amber)", color: "var(--color-bg-primary)" }}
        >
          {icon}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={item.path}
        title={item.label}
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors hover:bg-bg-hover"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {icon}
      </Link>
    </li>
  );
}
