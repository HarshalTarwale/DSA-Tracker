import {
  Building2Icon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  LayersIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/plan", label: "Plan", icon: CalendarCheckIcon },
  { href: "/topics", label: "Topics", icon: LayersIcon },
  { href: "/solved", label: "Solved", icon: CheckCircle2Icon },
  { href: "/companies", label: "Companies", icon: Building2Icon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export const MOBILE_TABS = ["/", "/plan", "/topics", "/solved"];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  if (pathname.startsWith("/topics/")) return "Topic";
  const item = [...NAV].reverse().find((n) => isActive(pathname, n.href));
  return item?.label ?? "DSA Tracker";
}
