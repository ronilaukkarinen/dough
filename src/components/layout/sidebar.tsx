"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Receipt,
  CalendarClock,
  Wallet,
  TrendingDown,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale-context";

const navKeys = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/chat", icon: MessageSquare, key: "chat" },
  { href: "/transactions", icon: Receipt, key: "transactions" },
  { href: "/bills", icon: CalendarClock, key: "bills" },
  { href: "/income", icon: Wallet, key: "income" },
  { href: "/debts", icon: TrendingDown, key: "debts" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLocale();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside
      className="l-sidebar"
      data-collapsed={collapsed || undefined}
    >
      {/* Logo */}
      <div className="l-sidebar-logo">
        <span className="l-sidebar-logo-text">
          {collapsed ? "D" : "Dough"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="l-sidebar-nav">
        {navKeys.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "l-sidebar-link",
                isActive && "is-active"
              )}
            >
              <item.icon className="l-sidebar-link-icon" />
              {!collapsed && <span>{t.nav[item.key]}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="l-sidebar-bottom">
        <Link
          href="/settings"
          className={cn(
            "l-sidebar-link",
            pathname === "/settings" && "is-active"
          )}
        >
          <Settings className="l-sidebar-link-icon" />
          {!collapsed && <span>{t.common.settings}</span>}
        </Link>
        <button
          onClick={handleLogout}
          className="l-sidebar-link"
        >
          <LogOut className="l-sidebar-link-icon" />
          {!collapsed && <span>{t.common.logout}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="l-sidebar-collapse-btn"
        >
          {collapsed ? <ChevronRight className="l-sidebar-collapse-icon" /> : <ChevronLeft className="l-sidebar-collapse-icon" />}
        </button>
      </div>
    </aside>
  );
}
