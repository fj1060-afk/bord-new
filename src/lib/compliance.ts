// Compliance engine: statutory rules checked against a snapshot of the data.
// Pure: the server loads the snapshot, this file decides. Each rule names its
// source and article; how binding it is depends on the company type.

import type { CompanyProfile, CompanyType } from "./company";

export type Source = "law" | "cma" | "guide" | "bylaws";
export const SOURCES: Record<Source, string> = {
  law: "نظام الشركات",
  cma: "لائحة حوكمة الشركات",
  guide: "الدليل الاسترشادي لأمين السر",
  bylaws: "نظام الشركة الأساس",
};

export type Level = "mandatory" | "guidance";
export type Status = "ok" | "warning" | "violation";

/** Companies Law binds joint-stock companies; CMA regulations bind listed ones; guides never bind. */
export function bindingLevel(source: Source, type: CompanyType): Level {
  if (source === "bylaws") return "mandatory";
  if (source === "law") return type === "listed_jsc" || type === "unlisted_jsc" ? "mandatory" : "guidance";
  if (source === "cma") return type === "listed_jsc" ? "mandatory" : "guidance";
  return "guidance";
}

type Person = { person_id: string; name: string };
export type Snapshot = {
  today: string;
  profile: Pick<CompanyProfile, "company_type" | "min_board_meetings" | "invite_days" | "secretary_person_id">;
  board: { id: string; term_end: string } | null;
  boardMembers: (Person & { category: string; position: string })[];
  committees: { id: string; name: string; kind: string; members: (Person & { position: string })[] }[];
  /** Board and committee meetings (not cancelled), any order. `body` is "board" or a committee id. */
  meetings: { id: string; body: string; starts_at: string; ended: boolean; extraordinary: boolean; pack_published_at: string | null }[];
  /** Attendance at ended board meetings. */
  attendance: { meeting_id: string; person_id: string; status: string }[];
  /** People who filed this year's disclosure. */
  disclosed: string[];
  /** Executive management (disclosures register). */
  executives: Person[];
  /** Passed circular resolutions; `body` as in meetings. */
  circulars: { id: string; title: string; body: string; closed_at: string | null; ratified: boolean }[];
};

export type Finding = {
  id: string;
  title: string;
  source: Source;
  article: string;
  level: Level;
  status: Status;
  detail: string;
  href: string;
};

type Check = Omit<Finding, "level" | "status"> & { status: Status | null };

const dayOf = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600000).toISOString().slice(0, 10);
const yearOf = (date: string) => date.slice(0, 4);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function boardChecks(s: Snapshot): Check[] {
  const n = s.boardMembers.length;
  const independent = s.boardMembers.filter((m) => m.category === "independent").length;
  const nonExec = s.boardMembers.filter((m) => m.category !== "executive").length;
  const neededIndependent = Math.max(2, Math.ceil(n / 3));
  const year = yearOf(s.today);
  // Only meetings already held count (a test or early-ended meeting may be dated in the future).
  const boardMeetings = s.meetings.filter((m) => m.body === "board" && (!m.ended || dayOf(m.starts_at) <= s.today));
  const held = boardMeetings.filter((m) => m.ended && yearOf(dayOf(m.starts_at)) === year);
  const dayOfYear = daysBetween(`${year}-01-01`, s.today) + 1;
  const expectedByNow = Math.floor((s.profile.min_board_meetings * dayOfYear) / 366);
  const lastHeld = boardMeetings.filter((m) => m.ended).map((m) => dayOf(m.starts_at)).sort().at(-1);
  const gap = lastHeld ? daysBetween(lastHeld, s.today) : null;
  const late = boardMeetings.filter((m) => !m.extraordinary && m.pack_published_at && yearOf(dayOf(m.starts_at)) === year && daysBetween(dayOf(m.pack_published_at), dayOf(m.starts_at)) < s.profile.invite_days);
  const termLeft = s.board ? daysBetween(s.today, s.board.term_end) : null;

  return [
    {
      id: "board.term",
      title: "سريان دورة المجلس",
      source: "law",
      article: "م68",
      href: "/board",
      status: !s.board ? "violation" : termLeft! < 0 ? "violation" : termLeft! <= 90 ? "warning" : "ok",
      detail: !s.board ? "لا يوجد مجلس نشط مسجّل." : termLeft! < 0 ? "انتهت دورة المجلس." : `تنتهي الدورة في ${s.board.term_end} (بعد ${termLeft} يوماً).`,
    },
    {
      id: "board.size",
      title: "عدد أعضاء المجلس ثلاثة على الأقل",
      source: "law",
      article: "م67",
      href: "/board",
      status: !s.board ? null : n >= 3 ? "ok" : "violation",
      detail: `أعضاء المجلس الحاليون ${n}.`,
    },
    {
      id: "board.independent",
      title: "الأعضاء المستقلون عضوان أو ثلث المجلس أيهما أكثر",
      source: "cma",
      article: "م16/3",
      href: "/board",
      status: !s.board || !n ? null : independent >= neededIndependent ? "ok" : "violation",
      detail: `المستقلون ${independent} والمطلوب ${neededIndependent}.`,
    },
    {
      id: "board.non_executive",
      title: "أغلبية المجلس من غير التنفيذيين",
      source: "cma",
      article: "م16/2",
      href: "/board",
      status: !s.board || !n ? null : nonExec > n / 2 ? "ok" : "violation",
      detail: `غير التنفيذيين ${nonExec} من ${n}.`,
    },
    {
      id: "board.meetings",
      title: `اجتماعات المجلس ${s.profile.min_board_meetings} في السنة على الأقل`,
      source: "law",
      article: "م80/1",
      href: "/meetings",
      status: !s.board ? null : held.length >= s.profile.min_board_meetings ? "ok" : held.length < expectedByNow ? "warning" : "ok",
      detail: `عُقد ${held.length} من ${s.profile.min_board_meetings} هذه السنة${held.length < expectedByNow ? `، والمتوقع حتى الآن ${expectedByNow}` : ""}.`,
    },
    {
      id: "board.quarterly",
      title: "اجتماع للمجلس كل ثلاثة أشهر على الأقل",
      source: "cma",
      article: "م30/ب",
      href: "/meetings",
      status: !s.board ? null : gap === null ? "warning" : gap > 92 ? "violation" : gap > 75 ? "warning" : "ok",
      detail: gap === null ? "لم يُعقد أي اجتماع للمجلس بعد." : `آخر اجتماع قبل ${gap} يوماً.`,
    },
    {
      id: "board.notice",
      title: `إرسال الدعوة والمستندات قبل الاجتماع بـ ${s.profile.invite_days} أيام`,
      source: "cma",
      article: "م30/ج",
      href: "/meetings",
      status: !s.board ? null : late.length ? "violation" : "ok",
      detail: late.length ? `${late.length} اجتماع هذه السنة نُشرت حزمته متأخرة (غير الطارئة).` : "كل الدعوات هذه السنة في وقتها.",
    },
    {
      id: "board.secretary",
      title: "تعيين أمين سر للمجلس",
      source: "law",
      article: "م78/4",
      href: "/admin/company?tab=secretary",
      status: s.profile.secretary_person_id ? "ok" : "violation",
      detail: s.profile.secretary_person_id ? "أمين السر معيّن." : "لم يُحدد أمين السر في ملف الشركة.",
    },
  ];
}

function absenceChecks(s: Snapshot): Check[] {
  const ended = s.meetings.filter((m) => m.body === "board" && m.ended).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const status = new Map(s.attendance.map((a) => [`${a.meeting_id}:${a.person_id}`, a.status]));
  const flagged = s.boardMembers.filter((m) => {
    const recent = ended.slice(-3).map((e) => status.get(`${e.id}:${m.person_id}`));
    const total = ended.filter((e) => status.get(`${e.id}:${m.person_id}`) === "absent").length;
    return (recent.length === 3 && recent.every((r) => r === "absent")) || total >= 5;
  });
  return [
    {
      id: "board.absence",
      title: "عدم الغياب بلا عذر ثلاثة اجتماعات متتالية أو خمسة متفرقة",
      source: "law",
      article: "م70",
      href: "/board",
      status: !s.board ? null : flagged.length ? "warning" : "ok",
      detail: flagged.length ? `يجوز للجمعية إنهاء عضوية: ${flagged.map((m) => m.name).join("، ")}.` : "لا توجد حالات غياب متكرر.",
    },
  ];
}

function committeeChecks(s: Snapshot): Check[] {
  const checks: Check[] = [];
  const category = new Map(s.boardMembers.map((m) => [m.person_id, m.category]));
  const year = yearOf(s.today);
  const heldThisYear = (id: string) => s.meetings.filter((m) => m.body === id && m.ended && yearOf(dayOf(m.starts_at)) === year).length;
  for (const c of s.committees) {
    const href = `/committees/${c.id}`;
    const voting = c.members.filter((m) => m.position !== "secretary");
    checks.push({
      id: `committee.size.${c.id}`,
      title: `${c.name}: من ثلاثة إلى خمسة أعضاء`,
      source: "cma",
      article: "م50/4",
      href,
      status: voting.length >= 3 && voting.length <= 5 ? "ok" : "violation",
      detail: `الأعضاء ${voting.length}.`,
    });
    if (c.kind === "audit") {
      const executives = voting.filter((m) => category.get(m.person_id) === "executive");
      const chair = voting.find((m) => m.position === "chair");
      const independents = voting.filter((m) => category.get(m.person_id) === "independent").length;
      checks.push(
        {
          id: `audit.no_executive.${c.id}`,
          title: `${c.name}: لا تضم أعضاء مجلس تنفيذيين`,
          source: "cma",
          article: "م51/أ",
          href,
          status: executives.length ? "violation" : "ok",
          detail: executives.length ? `أعضاء تنفيذيون: ${executives.map((m) => m.name).join("، ")}.` : "لا يوجد أعضاء تنفيذيون.",
        },
        {
          id: `audit.independent_chair.${c.id}`,
          title: `${c.name}: رئيسها عضو مستقل، وفيها مستقل على الأقل`,
          source: "cma",
          article: "م51/ب، ج",
          href,
          status: chair && category.get(chair.person_id) === "independent" && independents >= 1 ? "ok" : "violation",
          detail: !chair ? "لم يُحدد رئيس اللجنة." : category.get(chair.person_id) === "independent" ? "الرئيس مستقل." : `${chair.name} ليس عضواً مستقلاً في المجلس.`,
        },
        {
          id: `audit.meetings.${c.id}`,
          title: `${c.name}: أربعة اجتماعات في السنة على الأقل`,
          source: "cma",
          article: "م54/أ",
          href,
          status: heldThisYear(c.id) >= 4 ? "ok" : "warning",
          detail: `عُقد ${heldThisYear(c.id)} من 4 هذه السنة.`,
        },
      );
    }
    if (c.kind === "remuneration" || c.kind === "remuneration_nomination") {
      checks.push({
        id: `remuneration.meetings.${c.id}`,
        title: `${c.name}: اجتماع واحد في السنة على الأقل`,
        source: "cma",
        article: "م60",
        href,
        status: heldThisYear(c.id) >= 1 ? "ok" : "warning",
        detail: `عُقد ${heldThisYear(c.id)} هذه السنة.`,
      });
    }
  }
  if (!s.committees.some((c) => c.kind === "audit")) {
    checks.push({ id: "audit.exists", title: "تشكيل لجنة المراجعة", source: "cma", article: "م51/أ", href: "/committees", status: "violation", detail: "لا توجد لجنة نوعها «لجنة المراجعة»." });
  }
  return checks;
}

function circularChecks(s: Snapshot): Check[] {
  const pending = s.circulars.filter((c) => !c.ratified);
  // Overdue once a meeting of the same body has been held since voting closed.
  const overdue = pending.filter((c) => s.meetings.some((m) => m.body === c.body && m.ended && c.closed_at && m.starts_at > c.closed_at && dayOf(m.starts_at) <= s.today));
  if (!s.circulars.length) return [];
  return [
    {
      id: "circular.ratified",
      title: "إثبات القرارات بالتمرير في محضر أول اجتماع تالٍ",
      source: "law",
      article: "م82",
      href: "/resolutions/circular",
      status: overdue.length ? "violation" : pending.length ? "warning" : "ok",
      detail: overdue.length
        ? `عُقد اجتماع ولم تُثبت: ${overdue.map((c) => c.title).join("، ")}.`
        : pending.length
          ? `بانتظار الاجتماع القادم: ${pending.map((c) => c.title).join("، ")}.`
          : "كل القرارات بالتمرير مثبتة.",
    },
  ];
}

function disclosureChecks(s: Snapshot): Check[] {
  const missing = s.boardMembers.filter((m) => !s.disclosed.includes(m.person_id));
  const missingExec = s.executives.filter((m) => !s.disclosed.includes(m.person_id));
  return [
    {
      id: "disclosures.annual",
      title: "سجل إفصاحات أعضاء المجلس لهذه السنة",
      source: "guide",
      article: "تنظيم سجل الإفصاحات",
      href: "/board",
      status: !s.board ? null : missing.length ? "warning" : "ok",
      detail: missing.length ? `لم يُفصح: ${missing.map((m) => m.name).join("، ")}.` : "أفصح جميع الأعضاء.",
    },
    {
      id: "disclosures.executives",
      title: "سجل إفصاحات الإدارة التنفيذية لهذه السنة",
      source: "guide",
      article: "تنظيم سجل الإفصاحات",
      href: "/board",
      status: !s.executives.length ? null : missingExec.length ? "warning" : "ok",
      detail: missingExec.length ? `لم يُفصح: ${missingExec.map((m) => m.name).join("، ")}.` : "أفصح جميع التنفيذيين.",
    },
  ];
}

/** Every applicable rule with its result; guidance never counts as a violation. */
export function evaluate(s: Snapshot): Finding[] {
  return [...boardChecks(s), ...absenceChecks(s), ...committeeChecks(s), ...circularChecks(s), ...disclosureChecks(s)]
    .filter((c): c is Check & { status: Status } => c.status !== null)
    .map((c) => {
      const level = bindingLevel(c.source, s.profile.company_type);
      return { ...c, level, status: level === "guidance" && c.status === "violation" ? "warning" : c.status };
    });
}

/** Share of mandatory rules met (null when none apply). */
export function score(findings: Finding[]): number | null {
  const mandatory = findings.filter((f) => f.level === "mandatory");
  return mandatory.length ? Math.round((mandatory.filter((f) => f.status === "ok").length / mandatory.length) * 100) : null;
}
