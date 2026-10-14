import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { MEETING_MODES, MEETING_STATUS, MEETING_TYPES, meetingReference, rsvpSummary, totalMinutes } from "@/lib/meetings";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { setMeetingStatus, setPackPublished } from "../_actions/meeting";
import { AgendaTab } from "../_components/agenda-tab";
import { InfoRequests } from "../_components/info-requests";
import { InviteesTab } from "../_components/invitees-tab";
import { LiveTab, type LiveData } from "../_components/live-tab";
import { quorumRule } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import { MinutesTab } from "../_components/minutes-tab";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MeetingDetailsForm, RsvpForm } from "../_components/meeting-forms";
import type { AgendaItem } from "../_components/agenda-forms";

export const metadata: Metadata = { title: "الاجتماع" };

const TABS = { overview: "نظرة عامة", agenda: "الأجندة والمستندات", invitees: "المدعوون", live: "الانعقاد", minutes: "المحضر والقرارات" } as const;

export default async function MeetingPage({ params, searchParams }: PageProps<"/meetings/[meetingId]">) {
  const viewer = await requirePage("/meetings");
  const { meetingId } = await params;
  const { tab: rawTab } = (await searchParams) as { tab?: string };
  const tab = rawTab && rawTab in TABS ? (rawTab as keyof typeof TABS) : "overview";
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();

  const { data: meeting } = await supabase
    .from("meetings")
    .select("*, board:boards(name), committee:committees(name)")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) notFound();

  const [{ data: items }, { data: invitees }, { data: documents }, { data: docRequests }, { data: departments }] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title, title_en, description, kind, duration_minutes, presenter, department_id, status, outcome").eq("meeting_id", meetingId).order("position"),
    supabase.from("meeting_invitees").select("person_id, kind, rsvp, rsvp_note, person:people(full_name, user_id)").eq("meeting_id", meetingId),
    supabase.from("meeting_documents").select("id, title, file_name, size_bytes, agenda_item_id, document_request_id, created_at").eq("meeting_id", meetingId).order("created_at"),
    supabase
      .from("document_requests")
      .select("id, agenda_item_id, department_id, title, due_date, status, review_note, department:departments(name), agenda_item:agenda_items!inner(meeting_id)")
      .eq("agenda_item.meeting_id", meetingId)
      .order("created_at"),
    supabase.from("departments").select("id, name").eq("status", "active").order("name"),
  ]);
  // Departments the viewer may deliver documents for.
  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const people = organizer ? (await supabase.from("people").select("id, full_name").order("full_name")).data ?? [] : [];

  const agenda = (items ?? []) as AgendaItem[];
  const inviteeRows = (invitees ?? []) as unknown as { person_id: string; kind: string; rsvp: string; rsvp_note: string | null; person: { full_name: string; user_id: string | null } }[];
  const mine = inviteeRows.find((i) => i.person.user_id === viewer.id);
  const rsvp = rsvpSummary(inviteeRows);
  const body = (meeting.board ?? meeting.committee) as { name: string } | null;
  const status = meeting.status as keyof typeof MEETING_STATUS;
  const editable = organizer && status !== "cancelled";

  return (
    <>
      <PageHeader
        section={`${body?.name ?? ""} · اجتماع ${meetingReference(meeting.number, meeting.starts_at)}`}
        title={meeting.title}
        description={`${formatDateTime(new Date(meeting.starts_at))} · ${meeting.duration_minutes} دقيقة · ${MEETING_TYPES[meeting.meeting_type as keyof typeof MEETING_TYPES]}`}
        actions={
          <span className={clsx("rounded-full px-3 py-1 text-sm", status === "scheduled" ? "bg-primary-soft text-primary" : status === "draft" ? "bg-brass-soft text-brass" : "border border-rule text-ink-muted")}>
            {MEETING_STATUS[status]}
          </span>
        }
      />

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm" aria-label="أقسام الاجتماع">
        {Object.entries(TABS).map(([key, label]) => (
          <Link
            key={key}
            href={`/meetings/${meetingId}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={clsx("whitespace-nowrap border-b-2 px-4 py-2.5", tab === key ? "border-brass font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-6">
            {mine && status === "scheduled" && <RsvpForm meetingId={meetingId} current={mine.rsvp} />}
            <dl className="grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2">
              {[
                ["طريقة الانعقاد", MEETING_MODES[meeting.mode as keyof typeof MEETING_MODES]],
                ["المكان", meeting.location ?? "—"],
                ["بنود الأجندة", `${agenda.length} بنود · ${totalMinutes(agenda)} دقيقة`],
                ["المدعوون", `${inviteeRows.length} · سيحضر ${rsvp.accepted} · معتذر ${rsvp.declined} · لم يرد ${rsvp.pending}`],
                ["حزمة المجلس", meeting.pack_published_at ? `منشورة ${formatDateTime(new Date(meeting.pack_published_at))}` : "غير منشورة"],
                ["المستندات", `${(documents ?? []).length}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface p-4">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className="mt-1 text-sm">{value}</dd>
                </div>
              ))}
              {meeting.virtual_link && (
                <div className="bg-surface p-4 sm:col-span-2">
                  <dt className="text-xs text-ink-muted">رابط الاجتماع</dt>
                  <dd className="mt-1 text-sm">
                    <a href={meeting.virtual_link} target="_blank" rel="noreferrer" dir="ltr" className="text-primary hover:underline">
                      {meeting.virtual_link}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {editable && (
              <details className="rounded-lg border border-rule bg-surface">
                <summary className="cursor-pointer px-5 py-4 text-sm font-medium">تعديل بيانات الاجتماع</summary>
                <div className="border-t border-rule p-5">
                  <MeetingDetailsForm meeting={meeting} />
                </div>
              </details>
            )}
          </div>

          {organizer && (
            <aside className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5 text-sm">
              <h2 className="font-display text-lg font-bold">الإجراءات</h2>
              {status === "draft" && (
                <>
                  <p className="text-ink-muted">المسودة لا يراها إلا المنظمون. اعتمد الموعد لتظهر الدعوة للأعضاء ويردّوا عليها.</p>
                  <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "scheduled")} label="اعتماد الموعد وإرسال الدعوة" variant="secondary" confirm="اعتماد الموعد وإظهار الدعوة للمدعوين؟" />
                </>
              )}
              {status === "scheduled" && (
                <>
                  <ConfirmButton
                    action={setPackPublished.bind(null, meetingId, !meeting.pack_published_at)}
                    label={meeting.pack_published_at ? "سحب حزمة المجلس" : "نشر حزمة المجلس للمدعوين"}
                    variant="secondary"
                    confirm={meeting.pack_published_at ? "إخفاء المستندات عن المدعوين؟" : "إتاحة مستندات الاجتماع لكل المدعوين؟"}
                  />
                  <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "draft")} label="إرجاع إلى مسودة" variant="secondary" confirm="إرجاع الاجتماع إلى مسودة؟ ستختفي الدعوة عن المدعوين." />
                </>
              )}
              {status !== "cancelled" && can(viewer.permissions, "/meetings", LEVELS.manage) && (
                <ConfirmButton action={setMeetingStatus.bind(null, meetingId, "cancelled")} label="إلغاء الاجتماع" confirm="إلغاء الاجتماع؟ يبقى سجله محفوظاً." />
              )}
            </aside>
          )}
        </div>
      )}

      {tab === "agenda" && (
        <AgendaTab
          meetingId={meetingId}
          items={agenda}
          documents={documents ?? []}
          docRequests={(docRequests ?? []) as never}
          departments={departments ?? []}
          editable={editable}
          packPublished={Boolean(meeting.pack_published_at)}
          myDepartmentIds={(delegations ?? []).map((d) => d.department_id)}
        />
      )}
      {tab === "agenda" && (
        <InfoRequests meetingId={meetingId} items={agenda} organizer={organizer} invitee={Boolean(meeting.pack_published_at) && inviteeRows.some((i) => i.person_id === viewer.personId)} />
      )}

      {tab === "invitees" && <InviteesTab meetingId={meetingId} invitees={inviteeRows} people={people} editable={editable} />}

      {tab === "minutes" && <MinutesTab meeting={meeting} items={agenda} viewerId={viewer.id} organizer={organizer} />}

      {tab === "live" &&
        (status === "scheduled" ? (
          <LiveTab
            canRun={organizer}
            data={{
              meeting,
              invitees: inviteeRows,
              items: agenda as unknown as LiveData["items"],
              ...(await loadLive(supabase, meetingId, !!meeting.board_id)),
            }}
          />
        ) : (
          <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">
            يُعقد الاجتماع بعد اعتماد موعده.
          </p>
        ))}
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
