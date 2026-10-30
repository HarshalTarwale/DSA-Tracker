import {
  BookOpenIcon,
  Building2Icon,
  CalendarDaysIcon,
  CalendarCheckIcon,
  FileWarningIcon,
  LayoutDashboardIcon,
  LayersIcon,
  ListChecksIcon,
  RotateCcwIcon,
  SettingsIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** g + key shortcut */
  key?: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon, key: "d" },
  { href: "/today", label: "Today", icon: CalendarCheckIcon, key: "t" },
  { href: "/schedule", label: "Schedule", icon: CalendarDaysIcon, key: "s" },
  { href: "/problems", label: "Problems", icon: ListChecksIcon, key: "p" },
  { href: "/topics", label: "Topics", icon: LayersIcon },
  { href: "/revision", label: "Revision", icon: RotateCcwIcon, key: "r" },
  { href: "/mistakes", label: "Mistakes", icon: FileWarningIcon, key: "m" },
  { href: "/mocks", label: "Mocks", icon: TimerIcon },
  { href: "/companies", label: "Companies", icon: Building2Icon },
  { href: "/guide", label: "Guide", icon: BookOpenIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export const MOBILE_TABS = ["/", "/today", "/problems", "/revision"];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function titleFor(pathname: string): string {
  const item = [...NAV].reverse().find((n) => isActive(pathname, n.href));
  if (pathname.startsWith("/topics/")) return "Topic";
  return item?.label ?? "DSA Tracker";
}
