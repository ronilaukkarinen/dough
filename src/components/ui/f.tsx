"use client";

import { useLocale } from "@/lib/locale-context";

/**
 * Formatted amount with exact tooltip when decimals < 2.
 * Usage: <F v={1234.56} /> renders "1234 €" with tooltip "1234.56 €"
 * <F v={1234.56} s=" €/pv" /> for custom suffix
 */
export function F({ v, s = " €" }: { v: number; s?: string }) {
  const { fmt, decimals, privacyMode } = useLocale();
  if (privacyMode || decimals >= 2) {
    return <>{fmt(v)}{s}</>;
  }
  return (
    <span className="amt-tip" data-exact={`${v.toFixed(2)}${s}`}>
      {fmt(v)}{s}
    </span>
  );
}
