"use client";

import { ReactNode } from "react";

// Consistent top bar used across every page: title on the left,
// optional right-side content (status pills, account name, avatar).
export default function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-8 py-5"
      style={{ borderBottom: "1px solid var(--color-border-subtle)" }}
    >
      <h1 className="font-heading text-xl font-bold tracking-wide uppercase" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h1>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
