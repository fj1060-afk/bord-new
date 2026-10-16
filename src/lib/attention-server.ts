import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadJourney } from "@/app/(app)/meetings/_actions/journey-data";
import { daysUntil, sevByDue, sortAttention, type Attention, type Sev } from "./attention";
import type { Viewer } from "./auth";
import { blackouts, cmaNotices } from "./board-overview";
import { compositionChecks } from "./committee-powers";
import { complianceFindings } from "./compliance-server";
import { blocking, currentStage, STAGES, type Check } from "./journey";
import { companyProfile } from "./live-server";
import { formatGregorianDate } from "./format";
import { meetingReference } from "./meetings";
import { riyadhToday } from "./minutes";
import { currentYear } from "./org";
import { can, LEVELS } from "./permissions";

type Meeting = { id: string; title: string; number: number | null; starts_at: string; status: string; live_status: string; board_id: string | null; committee_id: string | null; committee: { name: string } | null };
export type PipelineRow = { id: string; title: string; where: string; days: number; stage: number; stuck: boolean; note: string; checks: { label: string; ok: boolean; level: string; detail?: string }[] };

const bodyOf = (m: { board_id: string | null; committee_id: string | null; committee?: { name: string } | null }) =>
  m.board_id ? { body: "board", bodyName: "مجلس الإدارة" } : { body: `committee:${m.committee_id}`, bodyName: m.committee?.name ?? "اللجنة" };
const date = (d: string) => formatGregorianDate(new Date(d.length > 10 ? d : `${d}T12:00:00Z`));
const ICON_BY_CHECK: Record<string, Attention["icon"]> = { pack: "send", notice: "send", "pack-email": "send", scheduled: "calendar", items: "file", definite: "file", owners: "person", "requirements-sent": "send", "requirements-checks": "shield", "quorum-possible": "users", held: "users", minutes: "pen", "minutes-complete": "pen", approved: "pen", circulars: "gavel", tasks: "gavel" };
const ACTION_BY_CHECK: Record<string, string> = { pack: "نشر الحزمة", scheduled: "اعتماد الموعد", "requirements-sent": "إرسال المتطلبات", items: "إضافة البنود", owners: "تحديد المسؤولين", minutes: "إعداد المحضر", approved: "متابعة التوقيع" };

/**
 * Everything that needs the viewer's attention, from every source they may
 * see (RLS and page permissions apply), and the meeting pipeline behind it.
 */
export async function collectAttention(supabase: SupabaseClient, viewer: Viewer): Promise<{ items: Attention[]; pipeline: PipelineRow[] }> {
  const p = viewer.permissions;
  const organizer = can(p, "/meetings", LEVELS.edit);
  const today = riyadhToday();
  const items: Attention[] = [];
  const pipeline: PipelineRow[] = [];
  const soon = new Date(Date.parse(`${today}T00:00:00Z`) + 45 * 86400000).toISOString();
  const recent = new Date(Date.parse(`${today}T00:00:00Z`) - 60 * 86400000).toISOString();

  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const myDepts = (delegations ?? []).map((d) => d.department_id);

  const [{ data: meetings }, { data: docs }, findings, profile, { data: committees }, { data: tasks }, { data: toSign }, { data: circulars }, { data: myDisclosure }, { data: boardRows }] = await Promise.all([
    organizer
      ? supabase.from("meetings").select("id, title, number, starts_at, status, live_status, board_id, committee_id, committee:committees(name)").neq("status", "cancelled").gte("starts_at", recent).lte("starts_at", soon).order("starts_at")
      : Promise.resolve({ data: [] }),
    organizer || myDepts.length
      ? supabase
          .from("document_requests")
          .select("id, title, due_date, status, department_id, department:departments(name), item:agenda_items!inner(title, meeting:meetings!inner(id, title, starts_at, board_id, committee_id, status, committee:committees(name)))")
          .in("status", ["requested", "returned"])
      : Promise.resolve({ data: [] }),
    can(p, "/governance-office") ? complianceFindings(supabase) : Promise.resolve(null),
    companyProfile(supabase),
    can(p, "/committees")
      ? supabase.from("committees").select("id, name, kind, committee_members(position, status, person:people(full_name, board_members(category, status)))").eq("status", "active")
      : Promise.resolve({ data: [] }),
    supabase
      .from("resolution_tasks")
      .select("id, title, due_date, status, assignee_user_id, department_id, department:departments(name), resolution:resolutions!inner(id, number, meeting:meetings!inner(board_id, committee_id, committee:committees(name)))")
      .in("status", ["open", "in_progress"])
      .not("due_date", "is", null)
      .lt("due_date", new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10)),
    viewer.personId ? supabase.from("minutes").select("id, version, meeting:meetings(id, title, starts_at, board_id, committee_id, committee:committees(name))").eq("status", "review") : Promise.resolve({ data: [] }),
    viewer.personId ? supabase.from("circular_resolutions").select("id, title, deadline, board_id, committee_id, committee:committees(name), votes:circular_votes(person_id)").eq("status", "open") : Promise.resolve({ data: [] }),
    viewer.personId ? supabase.from("disclosures").select("id").eq("person_id", viewer.personId).eq("year", currentYear()) : Promise.resolve({ data: [] }),
    can(p, "/board", LEVELS.edit) ? supabase.from("board_members").select("start_date, person:people(full_name)").eq("status", "active") : Promise.resolve({ data: [] }),
  ]);

  // 1. Meetings: the unmet checks of each one's current stage.
  const journeys = await Promise.all(((meetings ?? []) as unknown as Meeting[]).map(async (m) => ({ m, checks: (await loadJourney(supabase, m.id)) ?? [] })));
  for (const { m, checks } of journeys) {
    const stage = currentStage(checks);
    const days = daysUntil(today, m.starts_at);
    const open = checks.filter((c: Check) => c.stage === stage && blocking(c) && c.id !== "docs");
    const { body, bodyName } = bodyOf(m);
    const where = `${bodyName} · ${m.title} · ${date(m.starts_at)}`;
    if (m.live_status === "ended" && stage === 4 && !open.length) continue;
    if (days >= 0 || m.live_status === "ended")
      pipeline.push({ id: m.id, title: m.title, where: `${bodyName} · ${meetingReference(m.number, m.starts_at)} · ${date(m.starts_at)}`, days, stage, stuck: open.some((c) => c.level === "block"), note: open[0]?.label ?? "على المسار", checks: checks.filter((c) => c.stage === stage).map((c) => ({ label: c.label, ok: c.ok || !!c.overridden, level: c.level, detail: c.detail })) });
    for (const c of open)
      items.push({
        id: `j-${m.id}-${c.id}`,
        sev: m.live_status === "ended" ? "warn" : c.level === "block" && days <= 7 ? "block" : sevByDue("tip", days),
        icon: ICON_BY_CHECK[c.id] ?? "alert",
        what: c.label,
        where,
        who: "أمين السر",
        days: m.live_status === "ended" ? null : days,
        ref: c.ref,
        href: `/meetings/${m.id}?tab=${c.tab}`,
        action: ACTION_BY_CHECK[c.id] ?? `فتح «${STAGES[c.stage - 1].title}»`,
        body,
        bodyName,
      });
  }

  // 2. Documents asked of departments.
  for (const d of (docs ?? []) as unknown as { id: string; title: string; due_date: string | null; status: string; department_id: string; department: { name: string } | null; item: { title: string; meeting: Meeting } }[]) {
    const mine = myDepts.includes(d.department_id);
    if (!organizer && !mine) continue;
    const days = d.due_date ? daysUntil(today, d.due_date) : null;
    const { body, bodyName } = bodyOf(d.item.meeting);
    items.push({
      id: `d-${d.id}`,
      sev: sevByDue(d.status === "returned" ? "warn" : "tip", days),
      icon: "file",
      what: d.status === "returned" ? `مستند أُعيد للتعديل: ${d.title}` : `مستند مطلوب: ${d.title}`,
      where: `${bodyName} · ${d.item.meeting.title} · البند: ${d.item.title}`,
      who: d.department?.name ?? "الإدارة",
      days,
      href: `/meetings/${d.item.meeting.id}?tab=agenda`,
      action: mine ? "رفع المستند" : "فتح البند",
      body,
      bodyName,
      mine,
    });
  }

  // 3. Governance rules not met.
  for (const f of (findings ?? []).filter((f) => f.status !== "ok"))
    items.push({ id: `c-${f.id}`, sev: f.status === "violation" ? "block" : "warn", icon: "shield", what: f.title, where: f.detail, who: "الحوكمة", days: null, ref: `${f.article}`, href: f.href, action: "معالجة", body: f.id.startsWith("board.") ? "board" : "company", bodyName: f.id.startsWith("board.") ? "مجلس الإدارة" : "الشركة" });

  // 4. Committee composition (statutory committees).
  const listed = profile?.company_type === "listed_jsc";
  for (const c of (committees ?? []) as unknown as { id: string; name: string; kind: string; committee_members: { position: string; status: string; person: { full_name: string; board_members: { category: string; status: string }[] } }[] }[]) {
    const members = c.committee_members.filter((m) => m.status === "active").map((m) => ({ name: m.person.full_name, position: m.position, boardCategory: m.person.board_members.find((b) => b.status === "active")?.category ?? null }));
    for (const g of compositionChecks(c.kind, members).filter((g) => !g.ok))
      items.push({ id: `k-${c.id}-${g.ref}`, sev: g.guiding || !listed ? "warn" : "block", icon: "users", what: `${c.name}: ${g.ar}`, where: `${c.name} · التشكيل`, who: "مجلس الإدارة", days: null, ref: `لائحة الحوكمة ${g.ref}`, href: `/committees/${c.id}/charter`, action: "فتح التشكيل", body: `committee:${c.id}`, bodyName: c.name });
  }

  // 5. Resolution tasks late or due within a week: the viewer's own, or all for those who follow resolutions.
  for (const t of (tasks ?? []) as unknown as { id: string; title: string; due_date: string; assignee_user_id: string | null; department_id: string | null; department: { name: string } | null; resolution: { id: string; meeting: Meeting } }[]) {
    const mine = t.assignee_user_id === viewer.id || (!!t.department_id && myDepts.includes(t.department_id));
    if (!mine && !can(p, "/resolutions", LEVELS.edit)) continue;
    const days = daysUntil(today, t.due_date);
    const { body, bodyName } = bodyOf(t.resolution.meeting);
    items.push({ id: `t-${t.id}`, sev: sevByDue("tip", days), icon: "gavel", what: `مهمة قرار: ${t.title}`, where: `${bodyName} · القرارات`, who: mine ? "أنت" : (t.department?.name ?? "المكلّف"), days, href: mine ? "/my-tasks" : `/resolutions/${t.resolution.id}`, action: mine ? "تحديث المهمة" : "فتح القرار", body, bodyName, mine });
  }

  // 6. The viewer's own: minutes to sign, circulars to vote on, this year's disclosure.
  if (viewer.personId) {
    for (const m of (toSign ?? []) as unknown as { id: string; version: number; meeting: Meeting }[]) {
      const [{ data: signers }, { data: signed }] = await Promise.all([
        supabase.rpc("minutes_signers", { p_minutes: m.id }),
        supabase.from("minutes_signatures").select("person_id").eq("minutes_id", m.id).eq("version", m.version).eq("person_id", viewer.personId),
      ]);
      if (!(signers ?? []).some((s: { person_id: string }) => s.person_id === viewer.personId) || (signed ?? []).length) continue;
      const { body, bodyName } = bodyOf(m.meeting);
      items.push({ id: `s-${m.id}`, sev: "warn", icon: "pen", what: `توقيع محضر ${m.meeting.title}`, where: `${bodyName} · المحاضر`, who: "أنت", days: null, ref: "نظام الشركات م83", href: `/meetings/${m.meeting.id}?tab=minutes`, action: "التوقيع", body, bodyName, mine: true });
    }
    for (const c of (circulars ?? []) as unknown as { id: string; title: string; deadline: string | null; board_id: string | null; committee_id: string | null; committee: { name: string } | null; votes: { person_id: string }[] }[]) {
      if (c.votes.some((v) => v.person_id === viewer.personId)) continue;
      const days = c.deadline ? daysUntil(today, c.deadline) : null;
      const { body, bodyName } = bodyOf(c);
      items.push({ id: `v-${c.id}`, sev: sevByDue("warn", days), icon: "gavel", what: `التصويت على: ${c.title}`, where: `${bodyName} · القرارات بالتمرير`, who: "أنت", days, ref: "نظام الشركات م82", href: `/resolutions/circular?body=${c.board_id ? "board" : `committee:${c.committee_id}`}`, action: "التصويت", body, bodyName, mine: true });
    }
    const { data: seat } = await supabase.from("board_members").select("id").eq("person_id", viewer.personId).eq("status", "active").limit(1);
    if ((seat ?? []).length && !(myDisclosure ?? []).length)
      items.push({ id: "my-disclosure", sev: "block", icon: "person", what: `تقديم إفصاحك السنوي عن تعارض المصالح ${currentYear()}`, where: "ملفي · الإفصاحات", who: "أنت", days: null, ref: "نظام الشركات م71", href: `/people/${viewer.personId}`, action: "تقديم الإفصاح", body: "board", bodyName: "مجلس الإدارة", mine: true });
  }

  // 7. Listed companies: CMA notice of new board members, and trading blackout.
  if (listed) {
    for (const n of cmaNotices(((boardRows ?? []) as unknown as { start_date: string; person: { full_name: string } }[]).map((r) => ({ name: r.person.full_name, start_date: r.start_date })), today))
      items.push({ id: `cma-${n.name}`, sev: n.overdue ? "block" : "warn", icon: "shield", what: `إشعار الهيئة بعضوية ${n.name}`, where: "مجلس الإدارة · الأعضاء", who: "أمين السر", days: daysUntil(today, n.due), ref: "لائحة الحوكمة م17/د", href: "/board/members", action: "فتح الأعضاء", body: "board", bodyName: "مجلس الإدارة" });
    const b = blackouts(profile?.fiscal_year_end_month ?? 12, today);
    if (b.now && viewer.personId)
      items.push({ id: "blackout", sev: "warn", icon: "clock", what: "فترة حظر تداول سارية على أسهم الشركة", where: `حتى إعلان القوائم المالية للفترة المنتهية في ${date(b.now.end)}`, who: "الأعضاء وكبار التنفيذيين", days: null, ref: "قواعد طرح الأوراق المالية م86", href: "/board", action: "التفاصيل", body: "board", bodyName: "مجلس الإدارة" });
  }

  return { items: sortAttention(items), pipeline };
}

export const countBy = (items: Attention[], sev: Sev) => items.filter((i) => i.sev === sev).length;
