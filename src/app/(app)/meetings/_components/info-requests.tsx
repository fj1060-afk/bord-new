import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { AnswerInfoForm, RequestInfoForm } from "./info-forms";

type Request = { id: string; agenda_item_id: string; question: string; response: string | null; created_at: string; requester: { full_name: string } | null };

/** Members' requests for more information on agenda items (secretary guide), and the secretary's replies. */
export async function InfoRequests({ meetingId, items, organizer, invitee }: { meetingId: string; items: { id: string; position: number; title: string }[]; organizer: boolean; invitee: boolean }) {
  if (!organizer && !invitee) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("agenda_info_requests")
    .select("id, agenda_item_id, question, response, created_at, requester:people(full_name)")
    .eq("meeting_id", meetingId)
    .order("created_at");
  const rows = (data ?? []) as unknown as Request[];
  const label = Object.fromEntries(items.map((i) => [i.id, `${i.position}. ${i.title}`]));

  return (
    <section className="mt-6 flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5 text-sm">
      <h2 className="font-display text-lg font-bold">طلبات المعلومات</h2>
      <ul className="flex flex-col divide-y divide-rule">
        {rows.length === 0 && <li className="py-2 text-ink-muted">لا توجد طلبات.</li>}
        {rows.map((r) => (
          <li key={r.id} className="py-3">
            <p className="text-xs text-ink-muted">
              {label[r.agenda_item_id]} · {r.requester?.full_name} · {formatDateTime(new Date(r.created_at))}
            </p>
            <p className="whitespace-pre-line">{r.question}</p>
            {r.response ? (
              <p className="mt-1 whitespace-pre-line rounded-md bg-primary-soft px-3 py-2 text-primary">{r.response}</p>
            ) : organizer ? (
              <AnswerInfoForm meetingId={meetingId} requestId={r.id} />
            ) : (
              <p className="mt-1 text-brass">بانتظار الرد</p>
            )}
          </li>
        ))}
      </ul>
      {invitee && items.length > 0 && <RequestInfoForm meetingId={meetingId} items={items.map((i) => ({ id: i.id, label: label[i.id] }))} />}
    </section>
  );
}
