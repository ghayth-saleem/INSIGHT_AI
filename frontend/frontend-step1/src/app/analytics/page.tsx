"use client";

import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";

export default function AnalyticsPage() {
  const { isUnlocked } = useSession();

  if (!isUnlocked) return <LockedPage title="Analytics" />;

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold tracking-tight">
        Analytics
      </h2>
      <p className="text-text-secondary text-sm mt-2">
        KPIs and anomaly detection — will be built in Step 3.
      </p>
    </div>
  );
}
