"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="l-app-shell">
      {/* Mobile top bar */}
      <div className="l-topbar">
        <button
          className="l-topbar-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu />
        </button>
        <span className="l-topbar-title">Dough</span>
        <div className="l-topbar-spacer" />
      </div>

      {/* Sidebar overlay for mobile */}
      <div
        className={`l-sidebar-overlay ${sidebarOpen ? "is-open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="l-main">
        <div className="l-page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
