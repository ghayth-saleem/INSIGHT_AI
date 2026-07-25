"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Session data returned by POST /upload
interface SessionData {
  session_id: string;
  account_name: string;
  total_posts: number;
  date_range: { from: string; to: string };
  captions_detected: boolean;
  columns_mapped: string[];
}

interface SessionContextType {
  session: SessionData | null;
  setSession: (data: SessionData | null) => void;
  isUnlocked: boolean; // true when session_id exists
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);

  const isUnlocked = session !== null;

  return (
    <SessionContext.Provider value={{ session, setSession, isUnlocked }}>
      {children}
    </SessionContext.Provider>
  );
}

// Hook to use session anywhere
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
