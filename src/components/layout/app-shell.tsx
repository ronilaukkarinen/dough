"use client";

import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="l-app-shell">
      <Sidebar />
      <main className="l-main">
        <div className="l-page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
