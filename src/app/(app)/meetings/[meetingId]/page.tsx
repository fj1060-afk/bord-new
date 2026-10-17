import type { Metadata } from "next";
import Link from "next/link";
import { TabBar } from "@/components/ui/tab-bar";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ConfirmButton } from "@/components/org/confirm-button";
import { CalendarCheck, Files, FileText, Layers, MapPin, Settings, Trash2, TriangleAlert, Undo2, Users, UsersRound } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { dateParts, formatDateTime } from "@/lib/format";
import { MEETING_MODES, MEETING_STATUS, MEETING_TYPES, meetingReference, rsvpSummary, totalMinutes } from "@/lib/meetings";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { setMeetingStatus, setPackPublished } from "../_actions/meeting";
import { AgendaTab } from "../_components/agenda-tab";
import { meetingAffiliations, meetingDisclosures } from "@/lib/item-review-server";
import { bodyOf, libraryTemplates, matchTemplate, type Body, type Template } from "@/lib/item-templates";
import type { RequirementRow } from "../_components/requirements-panel";
import { currentYear } from "@/lib/org";
import { InfoRequests } from "../_components/info-requests";
import { PrintDocs } from "../_components/print-docs";
import { OutlookPanel } from "../_components/outlook-panel";
import { riyadhToday } from "@/lib/minutes";
import { defaultDue } from "@/lib/requirements";
import { packDeadline, requestsMail } from "@/lib/meeting-mail";
import { meetingMail } from "@/lib/meeting-mail-server";
import { loadPowers } from "@/lib/authority-server";
import { JourneyBar, StageNav } from "../_components/journey-bar";
import { MeetingHeader } from "../_components/meeting-header";
import { Card, MeetingDetailsCard } from "../_components/overview-cards";
import { itemIssues } from "../_components/item-issue-data";
import { loadJourney } from "../_actions/journey-data";
import { currentStage, stageDone, STAGES } from "@/lib/journey";
import { DocIntroForm } from "../_components/doc-intro-form";
import { InviteesTab } from "../_components/invitees-tab";
import { LiveTab, type LiveData } from "../_components/live-tab";
import { quorumRule } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import { MinutesTab } from "../_components/minutes-tab";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MeetingDetailsForm, RsvpForm } from "../_components/meeting-forms";
import type { AgendaItem } from "../_components/agenda-forms";
import { serviceSettings } from "@/lib/ai-server";

export const metadata: Metadata = { title: "الاجتماع" };

const TABS = { overview: "نظرة عامة", agenda: "الأجندة والمستندات", invitees: "المدعوون", live: "الانعقاد", minutes: "المحضر والقرارات" } as const;

export default async function MeetingPage({ params, searchParams }: PageProps<"/meetings/[meetingId]">) {
  const viewer = await requirePage("/meetings");
  const { meetingId } = await params;
  const { tab: rawTab, stage: rawStage } = (await searchParams) as { tab?: string; stage?: string };
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  // Organizers follow the journey: four stages, each showing its own tabs.
  const checks = organizer ? await loadJourney(supabase, meetingId) : null;
  const current = checks ? currentStage(checks) : 4;
  const tabStage = rawTab && !rawStage ? [...STAGES].reverse().find((s) => s.n <= current && (s.tabs as readonly string[]).includes(rawTab))?.n : undefined;
  const view = Math.min(Math.max(Number(rawStage) || tabStage || current, 1), current);
  const visible = (checks ? STAGES[view - 1].tabs : Object.keys(TABS)) as readonly (keyof typeof TABS)[];
  const tab = rawTab && visible.includes(rawTab as keyof typeof TABS) ? (rawTab as keyof typeof TABS) : visible[0];

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, board:boards(name), committee:committees(name, kind)")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) notFound();
  const services = await serviceSettings(supabase);
  const wordings = bodyOf({ board_id: meeting.board_id, committee_kind: (meeting.committee as { kind?: string } | null)?.kind });
  // A member without this year's disclosure sees no pack documents (enforced in RLS) when the company requires it.
  const packBlocked =
    !organizer && Boolean(meeting.pack_published_at) && services.pack_requires_disclosure && !(await supabase.rpc("pack_disclosure_ok", { p_meeting: meetingId })).data;

  const [{ data: users }, profile, disclosures, { data: library }, { data: requirementRows }, powers, affiliations] =
    tab === "agenda" && organizer
      ? await Promise.all([
          supabase.rpc("list_people_by_department"),
          companyProfile(supabase),
          meetingDisclosures(supabase, meetingId),
          supabase.from("agenda_item_library").select("title, title_en, body, kind, category, needs"),
          supabase
            .from("agenda_item_requirements")
            .select("id, agenda_item_id, kind, label, status, custom, department_id, assignee_user_id, due_date, checked_at, note, source")
            .eq("meeting_id", meetingId)
            .order("position"),
          loadPowers(supabase),
          meetingAffiliations(supabase, meetingId),
        ])
      : [{ data: [] }, null, [], { data: [] }, { data: [] }, undefined, []];
  const profileDays = profile?.invite_days ?? 5;
  // Outlook messages: the members' invitation and pack (overview), the request emails (agenda).
  const [mail, mailProfile] =
    organizer && (tab === "overview" || tab === "agenda") ? await Promise.all([meetingMail(supabase, meetingId, viewer.fullName), profile ?? companyProfile(supabase)]) : [null, null];
  const { data: minutesRow } = tab === "overview" ? await supabase.from("minutes").select("id").eq("meeting_id", meetingId).maybeSingle() : { data: null };
  const [{ data: items }, { data: invitees }, { data: documents }, { data: docRequests }, { data: departments }] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title, title_en, description, description_en, kind, duration_minutes, presenter, presenter_user_id, department_id, owner_user_id, status, outcome").eq("meeting_id", meetingId).order("position"),
    supabase.from("meeting_invitees").select("person_id, kind, rsvp, rsvp_note, person:people(full_name, user_id)").eq("meeting_id", meetingId),
    supabase.from("meeting_documents").select("id, title, file_name, size_bytes, agenda_item_id, document_request_id, created_at").eq("meeting_id", meetingId).order("created_at"),
    supabase
      .from("document_requests")
      .select("id, agenda_item_id, department_id, assignee_user_id, title, due_date, status, review_note, department:departments(name), agenda_item:agenda_items!inner(meeting_id)")
      .eq("agenda_item.meeting_id", meetingId)
      .order("created_at"),
    supabase.from("departments").select("id, name").eq("status", "active").order("name"),
  ]);
  // Departments the viewer may deliver documents for.
  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const people = organizer ? (await supabase.from("people").select("id, full_name").order("full_name")).data ?? [] : [];

  const agenda = (items ?? []) as AgendaItem[];
  const inviteeRows = ((invitees ?? []) as unknown as { person_id: string; kind: string; rsvp: string; rsvp_note: string | null; person: { full_name: string; user_id: string | null } }[]).filter((i) => i.person); // contributors may not see people
  const mine = inviteeRows.find((i) => i.person.user_id === viewer.id);
  const rsvp = rsvpSummary(inviteeRows);
  const body = (meeting.board ?? meeting.committee) as { name: string } | null;
  const status = meeting.status as keyof typeof MEETING_STATUS;
  const editable = organizer && status !== "cancelled";

  return (
    <>
      <MeetingHeader
        section={`${body?.name ?? ""} · اجتماع ${meetingReference(meeting.code)}`}
        title={meeting.title}
        when={dateParts(new Date(meeting.starts_at)).long}
        time={dateParts(new Date(meeting.starts_at)).time}
        minutes={meeting.duration_minutes}
        type={MEETING_TYPES[meeting.meeting_type as keyof typeof MEETING_TYPES]}
        status={status}
        statusLabel={MEETING_STATUS[status]}
      />

      {checks && <JourneyBar meetingId={meetingId} checks={checks} current={current} view={view} />}

      <TabBar id="meeting-tabs" label="أقسام الاجتماع" className="mb-6 flex overflow-x-auto border-b border-rule text-sm">
        {visible.map((key) => [key, TABS[key]] as const).map(([key, label]) => (
          <Link
            key={key}
            href={`/meetings/${meetingId}?${checks ? `stage=${view}&` : ""}tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={clsx("motion-colors flex-1 whitespace-nowrap px-4 py-3 text-center sm:flex-none", tab === key ? "font-bold text-brass" : "text-ink-muted hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </TabBar>
      {/* Each tab's content enters on its own when the tab changes. */}
      <div key={tab} className="page-in">

        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
            <div className="flex flex-col gap-6">
              {mine && status === "scheduled" && <RsvpForm meetingId={meetingId} current={mine.rsvp} />}
              <MeetingDetailsCard
                tiles={[
                  { icon: Users, label: "طريقة الانعقاد", value: MEETING_MODES[meeting.mode as keyof typeof MEETING_MODES] },
                  { icon: MapPin, label: "المكان", value: meeting.location ?? "—" },
                  { icon: FileText, label: "بنود الأجندة", value: `${agenda.length} بنود · ${totalMinutes(agenda)} دقيقة` },
                  { icon: UsersRound, label: "المدعوون", value: `${rsvp.accepted} سيحضر · ${rsvp.declined} معتذر · ${rsvp.pending} لم يرد` },
                  { icon: Layers, label: "حزمة المجلس", value: meeting.pack_published_at ? `منشورة ${formatDateTime(new Date(meeting.pack_published_at))}` : "غير منشورة" },
                  { icon: Files, label: "المستندات", value: `${(documents ?? []).length}` },
                ]}
                link={meeting.virtual_link}
                editForm={editable ? <MeetingDetailsForm meeting={meeting} allowRemote={services.remote_meetings} /> : undefined}
              />
              <PrintDocs meetingId={meetingId} hasMinutes={!!minutesRow} />
            </div>

            {organizer && (
              <aside className="flex flex-col gap-6">
                <Card title="الإجراءات" icon={Settings}>
                  {status === "draft" && (
                    <>
                      <p className="text-sm text-ink-muted">المسودة يراها المنظمون فقط. اعتمد الموعد لإظهار الدعوة للأعضاء.</p>
                      {checks && !stageDone(checks, 1) ? (
                        <p className="inline-flex items-center gap-2 rounded-lg border border-brass/50 bg-brass-soft px-3 py-2.5 text-sm text-brass">
                          <TriangleAlert size={18} aria-hidden="true" className="shrink-0" /> أكمل شروط مرحلة التحضير أولاً.
                        </p>
                      ) : (
                        <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "scheduled")} label="اعتماد الموعد وإرسال الدعوة" variant="secondary" confirm="اعتماد الموعد وإظهار الدعوة للمدعوين؟" className="w-full" icon={<><CalendarCheck size={16} aria-hidden="true" /> اعتماد الموعد وإرسال الدعوة</>} />
                      )}
                    </>
                  )}
                  {status === "scheduled" && (
                    <>
                      <ConfirmButton
                        action={setPackPublished.bind(null, meetingId, !meeting.pack_published_at)}
                        label={meeting.pack_published_at ? "سحب حزمة المجلس" : "نشر حزمة المجلس للمدعوين"}
                        variant="secondary"
                        confirm={meeting.pack_published_at ? "إخفاء المستندات عن المدعوين؟" : "إتاحة مستندات الاجتماع لكل المدعوين؟"}
                        className="w-full"
                        icon={<><Layers size={16} aria-hidden="true" /> {meeting.pack_published_at ? "سحب حزمة المجلس" : "نشر حزمة المجلس للمدعوين"}</>}
                      />
                      <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "draft")} label="إرجاع إلى مسودة" variant="secondary" confirm="إرجاع الاجتماع إلى مسودة؟ ستختفي الدعوة عن المدعوين." className="w-full" icon={<><Undo2 size={16} aria-hidden="true" /> إرجاع إلى مسودة</>} />
                    </>
                  )}
                  {status !== "cancelled" && can(viewer.permissions, "/meetings", LEVELS.manage) && (
                    <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "cancelled")} label="إلغاء الاجتماع" confirm="إلغاء الاجتماع؟ يبقى سجله محفوظاً." className="w-full" icon={<><Trash2 size={16} aria-hidden="true" /> إلغاء الاجتماع</>} />
                  )}
                </Card>
                {mail && status !== "cancelled" && (
                  <OutlookPanel
                    meetingId={meetingId}
                    meeting={mail.meeting}
                    minutes={mail.minutes}
                    invitees={mail.invitees}
                    items={mail.items}
                    deadline={packDeadline(meeting.starts_at, mailProfile?.invite_days ?? 5)}
                    today={riyadhToday()}
                    packEmailedAt={meeting.pack_emailed_at}
                  />
                )}
              </aside>
            )}
          </div>
        )}

        {tab === "agenda" && organizer && (
          <div className="mb-6">
            <DocIntroForm meetingId={meetingId} doc="agenda" intro={meeting.agenda_intro} introEn={meeting.agenda_intro_en} />
          </div>
        )}
        {tab === "agenda" && packBlocked && (
          <p className="mb-4 rounded-lg border border-brass bg-brass-soft p-4 text-sm">
            تُفتح مستندات الحزمة بعد تقديم إفصاحك السنوي عن تعارض المصالح لهذا العام.{" "}
            {viewer.personId && (
              <Link href={`/people/${viewer.personId}`} className="font-medium text-primary hover:underline">
                تقديم الإفصاح
              </Link>
            )}
          </p>
        )}
        {tab === "agenda" && (
          <AgendaTab
            meetingId={meetingId}
            items={agenda}
            documents={documents ?? []}
            docRequests={(docRequests ?? []) as never}
            targets={[
              ...(departments ?? []).map((d) => ({ value: `department:${d.id}`, label: d.name, group: "department" as const })),
              ...((users ?? []) as { user_id: string; full_name: string; department_name: string | null }[]).map((u) => ({ value: `user:${u.user_id}`, label: u.full_name, group: "user" as const, dept: u.department_name ?? undefined })),
            ]}
            viewerId={viewer.id}
            dueDefault={defaultDue(meeting.starts_at, profileDays ?? 5, riyadhToday())}
            editable={editable}
            packPublished={Boolean(meeting.pack_published_at)}
            myDepartmentIds={(delegations ?? []).map((d) => d.department_id)}
            library={libraryTemplates(library ?? [])}
            requirements={organizer ? withObsolete(requirementRows ?? [], agenda, libraryTemplates(library ?? []), wordings) : undefined}
            requirementsSentAt={meeting.requirements_sent_at}
            requestMails={mail ? mail.recipients.map((r) => ({ name: r.name, to: r.to, ...requestsMail(mail.meeting, r.name, r.requests, mail.tasksUrl) })) : undefined}
            body={wordings}
            issues={checks ? itemIssues(checks) : undefined}
            review={organizer ? { disclosures, listed: profile?.company_type === "listed_jsc", year: currentYear() - 1, powers, affiliations, company: profile?.name ?? "", committeeKind: meeting.board_id ? undefined : ((meeting.committee as { kind?: string } | null)?.kind ?? "other"), meetingDay: new Date(Date.parse(meeting.starts_at) + 3 * 3600000).toISOString().slice(0, 10) } : undefined}
          />
        )}
        {tab === "agenda" && (
          <InfoRequests meetingId={meetingId} items={agenda} organizer={organizer} invitee={Boolean(meeting.pack_published_at) && inviteeRows.some((i) => i.person_id === viewer.personId)} />
        )}

        {tab === "invitees" && <InviteesTab meetingId={meetingId} invitees={inviteeRows} people={people} editable={editable} />}

        {tab === "minutes" && <MinutesTab meeting={meeting} items={agenda} viewerId={viewer.id} organizer={organizer} />}

        {tab === "live" && organizer && (
          <div className="mb-6">
            <DocIntroForm meetingId={meetingId} doc="attendance" intro={meeting.attendance_intro} introEn={meeting.attendance_intro_en} />
          </div>
        )}
        {tab === "live" &&
          (status === "scheduled" ? (
            <LiveTab
              canRun={organizer}
              data={{
                meeting,
                invitees: inviteeRows,
                items: agenda as unknown as LiveData["items"],
                ...(await loadLive(supabase, meetingId, !!meeting.board_id)),
                remoteAllowed: services.remote_meetings,
              }}
            />
          ) : (
            <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">
              يُعقد الاجتماع بعد اعتماد موعده.
            </p>
          ))}
      </div>

      {checks && <StageNav meetingId={meetingId} checks={checks} view={view} />}
    </>
  );
}

async function loadLive(supabase: SupabaseClient, meetingId: string, isBoard: boolean) {
  const [{ data: attendance }, { data: proxies }, { data: breaks }, profile] = await Promise.all([
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("meeting_proxies").select("grantor_person_id, holder_person_id").eq("meeting_id", meetingId),
    supabase.from("meeting_breaks").select("started_at, ended_at").eq("meeting_id", meetingId).order("started_at"),
    companyProfile(supabase),
  ]);
  return {
    attendance: (attendance ?? []) as LiveData["attendance"],
    proxies: proxies ?? [],
    breaks: breaks ?? [],
    rule: quorumRule(profile, isBoard),
    proxyAllowed: profile?.proxy_allowed ?? true,
  };
}

/** Marks sent requirements an item's current wording no longer calls for. */
function withObsolete(rows: Omit<RequirementRow, "obsolete">[], items: { id: string; title: string }[], own: Template[], body: Body): RequirementRow[] {
  const wanted = new Map(items.map((i) => [i.id, new Set((matchTemplate(i.title, own, body)?.reqs ?? []).map((r) => r.ar))]));
  return rows.map((r) => ({ ...r, obsolete: r.status === "sent" && !r.custom && !wanted.get(r.agenda_item_id)?.has(r.label) }));
}
