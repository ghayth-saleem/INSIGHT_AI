"use client";

import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";

export default function SimulatePage() {
  const { isUnlocked } = useSession();

  if (!isUnlocked) return <LockedPage title="What-If Simulator" />;

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold tracking-tight">
        What-If Simulator
      </h2>
      <p className="text-text-secondary text-sm mt-2">
        Post configuration simulator — will be built in Step 5.
      </p>
    </div>
  );
}
