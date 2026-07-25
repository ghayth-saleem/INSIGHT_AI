"use client";

import { useSession } from "@/context/SessionContext";
import LockedPage from "@/components/LockedPage";

export default function ChatbotPage() {
  const { isUnlocked } = useSession();

  if (!isUnlocked) return <LockedPage title="Ask InsightAI" />;

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold tracking-tight">
        Ask InsightAI
      </h2>
      <p className="text-text-secondary text-sm mt-2">
        AI chatbot — will be built in Step 6.
      </p>
    </div>
  );
}
