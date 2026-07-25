"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, minWidth: size, minHeight: size };
  const paths: Record<string, React.ReactNode> = {
    logo: (
      <svg style={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
        <path d="M12 22.08V12"/><path d="M3.27 6.96L12 12l8.73-5.04"/>
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

export default function Sidebar() {
  const pathname = usePathname();
  const { isUnlocked } = useSession();

  return (
    <aside className="
      fixed left-0 top-0 h-full z-50
      w-[64px] hover:w-[240px]
      transition-[width] duration-300 ease-in-out
      overflow-hidden
      flex flex-col justify-between py-6
      group
    "
    style={{
      backgroundColor: "#09090f",
      borderRight: "1px solid rgba(255,255,255,0.06)",
    }}>

      {/* Top section */}
      <div className="flex flex-col gap-6">

        {/* Logo */}
        <div className="px-4 flex items-center whitespace-nowrap h-8">
          <div className="shrink-0 w-8 h-8 rounded flex items-center justify-center"
            style={{ background: "#1f1f28", border: "1px solid rgba(255,255,255,0.06)", minWidth: "32px", color: "#ffb95f" }}>
            <Icon name="logo" size={16} />
          </div>
          <div className="ml-4 flex flex-col overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span className="font-heading text-[13px] font-bold uppercase tracking-tighter whitespace-nowrap"
              style={{ color: "#e4e1ee" }}>
              INSIGHT AI
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest whitespace-nowrap"
              style={{ color: "#c8c5cf", opacity: 0.5 }}>
              Precision Data
            </span>
          </div>
        </div>

        {/* Nav */}
        <ul className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path;
            const isLocked = item.locked && !isUnlocked;
            return (
              <NavItem key={item.path} item={item} isActive={isActive} isLocked={isLocked} />
            );
          })}
        </ul>
      </div>

      {/* Bottom */}
      <div className="px-2">
        <Link href="/pipeline"
          className="flex items-center w-full p-2 rounded whitespace-nowrap transition-colors duration-200 hover:text-amber-500"
          style={{ color: "#c8c5cf", opacity: 0.35, textDecoration: "none" }}>
          <span className="shrink-0 flex items-center justify-center" style={{ minWidth: "20px", marginLeft: "6px", marginRight: "16px" }}>
            <Icon name="pipeline" size={18} />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-widest whitespace-nowrap
            opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Pipeline
          </span>
        </Link>
      </div>

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
  const iconWrap = (
    <span className="shrink-0 flex items-center justify-center" style={{ minWidth: "20px", marginLeft: "6px", marginRight: "16px" }}>
      <Icon name={item.icon} size={18} />
    </span>
  );

  const labelEl = (
    <span className="font-mono text-[11px] uppercase tracking-widest whitespace-nowrap
      opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {item.label}
    </span>
  );

  if (isLocked) {
    return (
      <li>
        <div className="flex items-center w-full p-2 rounded whitespace-nowrap"
          style={{ color: "#c8c5cf", opacity: 0.25, cursor: "not-allowed" }}>
          {iconWrap}{labelEl}
        </div>
      </li>
    );
  }

  if (isActive) {
    return (
      <li>
        <Link href={item.path}
          className="flex items-center w-full p-2 rounded whitespace-nowrap"
          style={{
            color: "#ffc174",
            borderLeft: "2px solid #ffc174",
            background: "rgba(245,158,11,0.07)",
            textDecoration: "none",
            paddingLeft: "6px",
          }}>
          {iconWrap}{labelEl}
        </Link>
      </li>
    );
  }

  return (
    <li>
      <Link href={item.path}
        className="flex items-center w-full p-2 rounded whitespace-nowrap transition-colors duration-200 hover:text-amber-500"
        style={{ color: "#c8c5cf", opacity: 0.6, textDecoration: "none" }}>
        {iconWrap}{labelEl}
      </Link>
    </li>
  );
}