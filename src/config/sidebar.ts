// The sidebar: sections, each with its own pages. Every link names the page
// permission it needs (the keys in navigation.ts, which the roles editor uses).

import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Briefcase,
  Building,
  CalendarDays,
  FileText,
  Gavel,
  Inbox,
  Landmark,
  LayoutDashboard,
  Library,
  ListChecks,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";

export type SideLink = { href: string; label: string; icon: LucideIcon; permission: string };
export type SideBranch = { href: string; label: string; icon: LucideIcon; permission: string; children: SideLink[] };
export type SideSection = { label: string; collapsible?: boolean; items: (SideLink | SideBranch)[] };

/** The pages of the board, and of each committee under its own base. */
const bodyPages = (base: string, dashboard: string, members: string, body: string): SideLink[] => [
  { href: base, label: dashboard, icon: LayoutDashboard, permission: members },
  { href: `${base}/members`, label: "الأعضاء", icon: Users, permission: members },
  { href: `${base}/meetings`, label: "الاجتماعات", icon: CalendarDays, permission: "/meetings" },
  { href: `${base}/minutes`, label: "المحاضر", icon: ScrollText, permission: "/minutes" },
  { href: `${base}/resolutions`, label: "القرارات", icon: Gavel, permission: "/resolutions" },
  { href: `/resolutions/circular?body=${body}`, label: "القرارات بالتمرير", icon: Send, permission: "/" },
  { href: `${base}/documents`, label: "المستندات", icon: FileText, permission: "/documents" },
];

/** The department users' portal: home, their requests and the meetings they may see, then their account. */
function portalSidebar(account: string): SideSection[] {
  return [
    {
      label: "عام",
      items: [
        { href: "/", label: "الرئيسية", icon: LayoutDashboard, permission: "/" },
        { href: "/requests", label: "الطلبات", icon: Inbox, permission: "/my-tasks" },
        { href: "/meetings", label: "الاجتماعات", icon: CalendarDays, permission: "/meetings" },
      ],
    },
    { label: "الحساب", items: [{ href: account, label: "حسابي", icon: UserRound, permission: "/" }] },
  ];
}

/** Sidebar sections for a viewer: only links they may open, committees listed by name; department users get the portal's. */
export function buildSidebar(allowed: string[], committees: { id: string; name: string }[], portal?: { account: string }): SideSection[] {
  const ok = (l: { permission: string }) => allowed.includes(l.permission);
  const sections: SideSection[] = portal ? portalSidebar(portal.account) : [
    {
      label: "عام",
      items: [
        { href: "/", label: "الرئيسية", icon: LayoutDashboard, permission: "/" },
        { href: "/my-tasks", label: "مهامي", icon: ListChecks, permission: "/my-tasks" },
        { href: "/meetings/requests", label: "طلبات البنود", icon: Inbox, permission: "/meetings" },
      ],
    },
    {
      label: "مجلس الإدارة",
      collapsible: true,
      items: bodyPages("/board", "لوحة المجلس", "/board", "board"),
    },
    {
      label: "اللجان",
      collapsible: true,
      items: [
        { href: "/committees", label: "لوحة اللجان", icon: UsersRound, permission: "/committees" },
        ...committees.map((c): SideBranch => ({
          href: `/committees/${c.id}`,
          label: c.name,
          icon: Landmark,
          permission: "/committees",
          children: [
            ...bodyPages(`/committees/${c.id}`, "لوحة اللجنة", "/committees", `committee:${c.id}`).slice(0, 2),
            { href: `/committees/${c.id}/charter`, label: "اللائحة والصلاحيات", icon: ScrollText, permission: "/committees" },
            ...bodyPages(`/committees/${c.id}`, "لوحة اللجنة", "/committees", `committee:${c.id}`).slice(2),
          ],
        })),
      ],
    },
    {
      label: "المكاتب",
      items: [
        { href: "/governance-office", label: "مكتب الحوكمة", icon: BookOpenCheck, permission: "/governance-office" },
        { href: "/director-office", label: "مكتب المدير", icon: Briefcase, permission: "/director-office" },
        { href: "/meetings/library", label: "مستودع البنود", icon: Library, permission: "/meetings" },
        { href: "/documents", label: "مكتبة المستندات", icon: FileText, permission: "/documents" },
      ],
    },
    {
      label: "الإدارة",
      items: [
        { href: "/admin/users", label: "المستخدمون والإدارات", icon: Users, permission: "/admin/users" },
        { href: "/admin/roles", label: "الأدوار والصلاحيات", icon: ShieldCheck, permission: "/admin/roles" },
        { href: "/admin/company", label: "ملف الشركة", icon: Building, permission: "/admin/company" },
        { href: "/admin/settings", label: "الإعدادات", icon: Settings, permission: "/admin/settings" },
      ],
    },
  ];
  return sections
    .map((s) => ({ ...s, items: s.items.filter(ok).map((i) => ("children" in i ? { ...i, children: i.children.filter(ok) } : i)) }))
    .filter((s) => s.items.length > 0);
}

const links = (sections: SideSection[]) => sections.flatMap((s) => s.items.flatMap((i) => ("children" in i ? [i, ...i.children] : [i])));

/** The link a page belongs to: an exact match, else the longest prefix ("/" only for itself); links with a query match it exactly. */
export function activeLink(sections: SideSection[], pathname: string, search = ""): string | undefined {
  const full = search ? `${pathname}?${search}` : pathname;
  return links(sections)
    .map((l) => l.href)
    .filter((href) => (href.includes("?") ? href === full : href === pathname || (href !== "/" && pathname.startsWith(`${href}/`))))
    .sort((a, b) => b.length - a.length)[0];
}
