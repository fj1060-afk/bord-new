import type { LucideIcon } from "lucide-react";
import {
  BookOpenCheck,
  Briefcase,
  Building,
  Building2,
  CalendarDays,
  FileText,
  Gavel,
  Landmark,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UsersRound,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** The build phase that delivers this page. */
  phase: number;
  /** What the page will let people do, shown until it is built. */
  summary: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navigation: NavGroup[] = [
  {
    label: "عام",
    items: [
      {
        href: "/",
        label: "الرئيسية",
        icon: LayoutDashboard,
        phase: 6,
        summary: "مؤشرات المجلس واللجان والاجتماعات القادمة والمهام المتأخرة.",
      },
      {
        href: "/my-tasks",
        label: "مهامي",
        icon: ListChecks,
        phase: 5,
        summary: "المهام المسندة إليك من القرارات، مع رفع أدلة الإنجاز.",
      },
    ],
  },
  {
    label: "الحوكمة",
    items: [
      {
        href: "/board",
        label: "مجلس الإدارة",
        icon: Landmark,
        phase: 2,
        summary: "تشكيل المجلس، والأعضاء وملفاتهم، والإفصاحات السنوية.",
      },
      {
        href: "/committees",
        label: "اللجان",
        icon: UsersRound,
        phase: 2,
        summary: "اللجان وأعضاؤها ومهامها واجتماعاتها.",
      },
      {
        href: "/meetings",
        label: "الاجتماعات",
        icon: CalendarDays,
        phase: 3,
        summary: "إنشاء الاجتماعات، والدعوات، والأجندة، والحضور، وإدارة الانعقاد.",
      },
      {
        href: "/minutes",
        label: "المحاضر",
        icon: ScrollText,
        phase: 5,
        summary: "صياغة المحاضر ومراجعة نسخها وجمع التوقيعات.",
      },
      {
        href: "/resolutions",
        label: "القرارات",
        icon: Gavel,
        phase: 5,
        summary: "سجل القرارات وحالة تنفيذ المهام المترتبة عليها.",
      },
      {
        href: "/documents",
        label: "المستندات",
        icon: FileText,
        phase: 6,
        summary: "مكتبة المستندات وحزم المجلس.",
      },
    ],
  },
  {
    label: "المكاتب",
    items: [
      {
        href: "/governance-office",
        label: "مكتب الحوكمة",
        icon: BookOpenCheck,
        phase: 7,
        summary: "مركز العمل، والتقويم، والمواعيد النهائية، والتقارير.",
      },
      {
        href: "/director-office",
        label: "مكتب المدير",
        icon: Briefcase,
        phase: 7,
        summary: "الوارد، والمسودات، والمتابعات، وجهات الاتصال.",
      },
    ],
  },
  {
    label: "الإدارة",
    items: [
      {
        href: "/admin/users",
        label: "المستخدمون",
        icon: Users,
        phase: 1,
        summary: "إضافة المستخدمين وتعطيلهم وإعادة تفعيلهم.",
      },
      {
        href: "/admin/roles",
        label: "الأدوار والصلاحيات",
        icon: ShieldCheck,
        phase: 1,
        summary: "تحديد ما يراه كل دور وما يستطيع فعله في كل صفحة.",
      },
      {
        href: "/admin/departments",
        label: "الإدارات",
        icon: Building2,
        phase: 2,
        summary: "الإدارات والمخوّلون بالرفع والمتابعة نيابة عنها.",
      },
      {
        href: "/admin/company",
        label: "ملف الشركة",
        icon: Building,
        phase: 9,
        summary: "نوع الشركة وأحكام نظامها الأساس وأمين سر المجلس.",
      },
      {
        href: "/admin/settings",
        label: "الإعدادات",
        icon: Settings,
        phase: 1,
        summary: "الخدمات الخارجية والاجتماعات والخصوصية، والجلسات النشطة وسجل التدقيق.",
      },
    ],
  },
];

export const navItems: NavItem[] = navigation.flatMap((group) => group.items);

export function findNavItem(href: string): NavItem | undefined {
  return navItems.find((item) => item.href === href);
}

/** The nav item that owns a pathname: an exact match, else the longest prefix. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems
    .filter(
      (item) =>
        item.href === pathname ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
