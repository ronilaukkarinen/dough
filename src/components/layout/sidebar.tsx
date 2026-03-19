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
  LineChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
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
  { href: "/net-worth", icon: LineChart, key: "netWorth" },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLocale();

  const handleLogout = () => {
    // Use GET redirect — works on all browsers including iOS Orion
    window.location.href = "/api/auth/logout";
  };

  const handleNavClick = () => {
    onClose();
  };

  return (
    <aside
      className={cn("l-sidebar", isOpen && "is-open")}
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
              onClick={handleNavClick}
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
          onClick={handleNavClick}
          className={cn(
            "l-sidebar-link",
            pathname === "/settings" && "is-active"
          )}
        >
          <Settings className="l-sidebar-link-icon" />
          {!collapsed && <span>{t.common.settings}</span>}
        </Link>
        <button
          type="button"
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
