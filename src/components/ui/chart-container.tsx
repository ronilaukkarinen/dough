"use client";

import { useState, useEffect, type ReactNode } from "react";

export function ChartContainer({
  children,
  height = 280,
}: {
  children: ReactNode;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} />;
  }

  return <div style={{ height }}>{children}</div>;
}
