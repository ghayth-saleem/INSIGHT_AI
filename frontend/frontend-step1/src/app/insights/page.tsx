"use client";

import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";

export default function InsightsPage() {
  const { isUnlocked } = useSession();

  if (!isUnlocked) return <LockedPage title="Insights" />;

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold tracking-tight">
        Insights
      </h2>
      <p className="text-text-secondary text-sm mt-2">
        Prophet, AraBERT, and marketing plan — will be built in Step 4.
      </p>
    </div>
  );
}
