import Link from "next/link";
import clsx from "clsx";
import { Printer } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass } from "@/components/ui/styles";
import { ATTENDANCE, ITEM_STATUS, LIVE_STATUS, quorum, type AttendanceStatus } from "@/lib/live";
import type { QuorumRule } from "@/lib/company";
import { ITEM_KINDS } from "@/lib/meetings";
import { endMeeting, openItem, toggleBreak } from "../_actions/live";
import { AttendanceSelect, CloseItemForm, MeetingTimer, ProxySelect, QuorumOverrideForm, StartMeetingButton } from "./live-controls";

export type LiveData = {
  meeting: {
    id: string;
    live_status: keyof typeof LIVE_STATUS;
    started_at: string | null;
    ended_at: string | null;
    current_item_id: string | null;
    quorum_required: number | null;
    duration_minutes: number;
  };
  invitees: { person_id: string; kind: string; person: { full_name: string } }[];
  attendance: { person_id: string; status: AttendanceStatus }[];
  proxies: { grantor_person_id: string; holder_person_id: string }[];
  breaks: { started_at: string; ended_at: string | null }[];
  rule: QuorumRule;
  proxyAllowed: boolean;
  items: { id: string; position: number; title: string; kind: keyof typeof ITEM_KINDS; status: keyof typeof ITEM_STATUS; outcome: string | null; duration_minutes: number | null }[];
};

export function LiveTab({ data, canRun }: { data: LiveData; canRun: boolean }) {
  const { meeting, invitees, attendance, proxies, breaks, items } = data;
  const status = Object.fromEntries(attendance.map((a) => [a.person_id, a.status]));
  const holderOf = Object.fromEntries(proxies.map((p) => [p.grantor_person_id, p.holder_person_id]));
  const members = invitees.filter((i) => i.kind === "member");
  const q = quorum({
    members: members.map((m) => m.person_id),
    attendance: status,
    proxies: proxies.map((p) => ({ grantor: p.grantor_person_id, holder: p.holder_person_id })),
    required: meeting.quorum_required,
    rule: data.rule,
  });
  const live = meeting.live_status === "in_progress" || meeting.live_status === "paused";
  const ended = meeting.live_status === "ended";
  const current = items.find((i) => i.id === meeting.current_item_id);
  const sorted = [...invitees].sort((a, b) => a.kind.localeCompare(b.kind) || a.person.full_name.localeCompare(b.person.full_name, "ar"));
  const attendingMembers = members.filter((m) => status[m.person_id] === "present" || status[m.person_id] === "remote");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-6">
        {live && (
          <section className="rounded-lg border-2 border-brass bg-surface p-5">
            {current ? (
              <>
                <p className="text-xs text-brass">البند الحالي</p>
                <h2 className="mb-1 font-display text-2xl font-bold">
                  <span className="font-mono text-brass">{current.position}.</span> {current.title}
                </h2>
                <p className="mb-4 text-sm text-ink-muted">
                  {ITEM_KINDS[current.kind]}
                  {current.duration_minutes && ` · ${current.duration_minutes} دقيقة`}
                </p>
                {canRun && <CloseItemForm key={current.id} meetingId={meeting.id} itemId={current.id} />}
              </>
            ) : (
              <p className="text-sm text-ink-muted">لا يوجد بند مفتوح. اختر بنداً من الأجندة أو أنهِ الاجتماع.</p>
            )}
          </section>
        )}

        <section>
          <h2 className="mb-3 font-display text-xl font-bold">الأجندة</h2>
          <ol className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {items.length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا توجد بنود.</li>}
            {items.map((item) => (
              <li key={item.id} className={clsx("flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm", item.id === meeting.current_item_id && "bg-brass-soft")}>
                <span className="font-mono text-brass">{item.position}.</span>
                <span className="min-w-0 flex-1">
                  {item.title}
                  {item.outcome && <span className="block text-xs text-ink-muted">{item.outcome}</span>}
                </span>
                <span className={clsx("text-xs", item.status === "discussed" ? "text-primary" : item.status === "deferred" ? "text-danger" : "text-ink-muted")}>
                  {item.id === meeting.current_item_id ? "يُناقش الآن" : ITEM_STATUS[item.status]}
                </span>
                {canRun && live && item.status === "pending" && item.id !== meeting.current_item_id && (
                  <form action={openItem.bind(null, meeting.id, item.id)}>
                    <button className="text-xs text-primary hover:underline">فتح البند</button>
                  </form>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">الحضور</h2>
            <Link href={`/print/meetings/${meeting.id}/attendance`} target="_blank" className={buttonClass("secondary", "px-3 py-1.5 text-xs")}>
              <Printer size={14} aria-hidden="true" /> كشف الحضور
            </Link>
          </div>
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {sorted.length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا يوجد مدعوون.</li>}
            {sorted.map((i) => {
              const holders = attendingMembers
                .filter((m) => m.person_id !== i.person_id && (!Object.values(holderOf).includes(m.person_id) || holderOf[i.person_id] === m.person_id))
                .map((m) => ({ id: m.person_id, name: m.person.full_name }));
              return (
                <li key={i.person_id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    {i.person.full_name}
                    {i.kind === "guest" && <span className="ms-2 text-xs text-brass">ضيف</span>}
                  </span>
                  {canRun && !ended ? (
                    <>
                      <AttendanceSelect meetingId={meeting.id} personId={i.person_id} value={status[i.person_id]} disabled={false} />
                      {status[i.person_id] === "proxy" && i.kind === "member" && !data.proxyAllowed && <span className="text-xs text-danger">الإنابة غير مسموحة في نظام الشركة الأساس</span>}
                      {status[i.person_id] === "proxy" && i.kind === "member" && data.proxyAllowed && (
                        <ProxySelect meetingId={meeting.id} grantorId={i.person_id} value={holderOf[i.person_id]} holders={holders} disabled={false} />
                      )}
                    </>
                  ) : (
                    <span className="text-ink-muted">{status[i.person_id] ? ATTENDANCE[status[i.person_id]] : "لم يُسجّل"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <MeetingTimer startedAt={meeting.started_at} endedAt={meeting.ended_at} breaks={breaks} plannedMinutes={meeting.duration_minutes} />
        <div className={clsx("rounded-lg border p-5 text-sm", q.met ? "border-primary bg-primary-soft" : "border-danger/40 bg-surface")}>
          <p className="font-medium">{q.met ? "النصاب مكتمل" : "النصاب غير مكتمل"}</p>
          <p className="mt-1 text-lg">
            <span className="font-mono text-2xl">{q.counted}</span> محتسبون من <span className="font-mono">{q.required}</span> مطلوبين
          </p>
          <p className="text-xs text-ink-muted">من {q.members} أعضاء · يُحتسب الحاضر والحاضر عن بُعد ومن أناب حاضراً</p>
          {canRun && !live && !ended && (
            <div className="mt-3 border-t border-rule pt-3">
              <QuorumOverrideForm meetingId={meeting.id} value={meeting.quorum_required} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-rule bg-surface p-5 text-sm">
          <p>
            الحالة: <strong>{LIVE_STATUS[meeting.live_status]}</strong>
          </p>
          {canRun && meeting.live_status === "not_started" && <StartMeetingButton meetingId={meeting.id} ready={q.met} />}
          {canRun && live && (
            <>
              <form action={toggleBreak.bind(null, meeting.id)}>
                <button className={buttonClass("secondary", "w-full")}>{meeting.live_status === "paused" ? "استئناف الاجتماع" : "بدء استراحة"}</button>
              </form>
              <ConfirmButton action={endMeeting.bind(null, meeting.id)} label="إنهاء الاجتماع" confirm="إنهاء الاجتماع وتسجيل وقت الانتهاء؟" />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
