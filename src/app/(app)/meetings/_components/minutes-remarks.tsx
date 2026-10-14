import { ConfirmButton } from "@/components/org/confirm-button";
import { formatDateTime } from "@/lib/format";
import type { MinutesStatus } from "@/lib/minutes";
import { REMARK_KINDS, type RemarkKind } from "@/lib/secretary";
import { createClient } from "@/lib/supabase/server";
import { deleteRemark } from "../_actions/remarks";
import { RemarkForm } from "./remark-form";

type Props = {
  meetingId: string;
  minutesId: string;
  status: MinutesStatus;
  organizer: boolean;
  canComment: boolean;
  resolutions: { id: string; label: string }[];
  people: { id: string; name: string }[];
};

/** Members' comments on the draft, and the recorded reservations, dissent and recusals. */
export async function MinutesRemarks({ meetingId, minutesId, status, organizer, canComment, resolutions, people }: Props) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("minutes_remarks")
    .select("id, kind, note, created_at, resolution_id, person:people(full_name)")
    .eq("minutes_id", minutesId)
    .order("created_at");
  const remarks = (data ?? []) as unknown as { id: string; kind: RemarkKind; note: string; created_at: string; resolution_id: string | null; person: { full_name: string } | null }[];
  const label = Object.fromEntries(resolutions.map((r) => [r.id, r.label]));

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5">
      <h2 className="font-display text-xl font-bold">الملاحظات والتحفظات</h2>
      <p className="text-xs text-ink-muted">يُثبت الرأي المخالف للقرار وتعارض المصالح في المحضر (نظام الشركات م71، م79/4؛ لائحة الحوكمة م31).</p>
      <ul className="flex flex-col divide-y divide-rule text-sm">
        {remarks.length === 0 && <li className="py-2 text-ink-muted">لا توجد ملاحظات.</li>}
        {remarks.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
            <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs text-brass">{REMARK_KINDS[r.kind]}</span>
            <span className="min-w-0 flex-1">
              <span className="font-medium">{r.person?.full_name}</span>
              {r.resolution_id && <span className="text-xs text-ink-muted"> · {label[r.resolution_id]}</span>}
              <span className="block whitespace-pre-line">{r.note}</span>
            </span>
            <span className="text-xs text-ink-muted">{formatDateTime(new Date(r.created_at))}</span>
            {organizer && status !== "approved" && <ConfirmButton action={deleteRemark.bind(null, meetingId, r.id)} label="حذف" confirm="حذف الملاحظة؟" />}
          </li>
        ))}
      </ul>
      {status === "review" && canComment && <RemarkForm meetingId={meetingId} minutesId={minutesId} mode="comment" people={[]} resolutions={[]} />}
      {organizer && status !== "approved" && <RemarkForm meetingId={meetingId} minutesId={minutesId} mode="record" people={people} resolutions={resolutions} />}
    </section>
  );
}
