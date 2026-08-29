import type { AppRole } from "@/lib/auth";
import {
  LayoutDashboard,
  CalendarDays,
  Shield,
  Trophy,
  Swords,
  Radio,
  ListOrdered,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
};

export const navConfig: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "TABULATOR"] },
  { href: "/seasons", label: "Seasons", icon: CalendarDays, roles: ["ADMIN"] },
  { href: "/teams", label: "Teams", icon: Shield, roles: ["ADMIN"] },
  { href: "/events", label: "Events", icon: Trophy, roles: ["ADMIN"] },
  { href: "/matches", label: "Matches", icon: Swords, roles: ["ADMIN"] },
  { href: "/scoreboard", label: "Scoreboard", icon: Radio, roles: ["ADMIN", "TABULATOR"] },
  { href: "/points-rules", label: "Points Rules", icon: ListOrdered, roles: ["ADMIN"] },
  { href: "/users", label: "Users", icon: Users, roles: ["ADMIN"] },
];

/**
 * Server-side enforcement matrix for (dashboard)/layout.tsx — nav filtering alone is
 * cosmetic, so a TABULATOR hitting an ADMIN-only URL directly must still be redirected.
 */
export function isPathAllowedForRole(pathname: string, role: AppRole): boolean {
  const item = navConfig.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  if (!item) return true; // unknown paths (e.g. /dashboard subpages not in nav) default-allow
  return item.roles.includes(role);
}
