import type { Metadata } from "next";
import clsx from "clsx";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { RegulationNote } from "@/components/ui/regulation-note";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { meetingReference } from "@/lib/meetings";
import { serviceSettings } from "@/lib/ai-server";
import { affiliationNotices, type Affiliation } from "@/lib/affiliations";
import { bodyAffiliations } from "@/lib/item-review-server";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { CIRCULAR_STATUS, circularOutcome, VOTES } from "@/lib/secretary";
import { createClient } from "@/lib/supabase/server";
import { castVote, closeCircular } from "./actions";
import { CircularForm, RatifyForm } from "./forms";

export const metadata: Metadata = { title: "القرارات بالتمرير" };

type Circular = {
  id: string;
  title: string;
  text: string;
  deadline: string | null;
  status: keyof typeof CIRCULAR_STATUS;
  board_id: string | null;
  committee_id: string | null;
  ratified_meeting_id: string | null;
  board: { name: string } | null;
  committee: { name: string } | null;
  votes: { person_id: string; vote: keyof typeof VOTES }[];
};

export default async function CircularPage() {
  // Members vote here without access to the resolutions register; RLS shows each person their bodies only.
  const viewer = await requirePage("/");
  const manage = can(viewer.permissions, "/resolutions", LEVELS.edit);
  const supabase = await createClient();
  const { data } = await supabase
    .from("circular_resolutions")
    .select("id, title, text, deadline, status, board_id, committee_id, ratified_meeting_id, board:boards(name), committee:committees(name), votes:circular_votes(person_id, vote)")
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as unknown as Circular[];
  const voters = await Promise.all(rows.map((r) => supabase.rpc("circular_voters", { p_circular: r.id }).then(({ data }) => (data ?? []) as { person_id: string; user_id: string | null; full_name: string }[])));
  const [{ data: boards }, { data: committees }, { data: meetings }] = manage
    ? await Promise.all([
        supabase.from("boards").select("id, name").eq("status", "active"),
        supabase.from("committees").select("id, name").eq("status", "active"),
        supabase.from("meetings").select("id, number, starts_at, board_id, committee_id").neq("status", "cancelled").order("starts_at", { ascending: false }).limit(50),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  // Organizers see members whose CV ties them to a company the text names.
  const openBodies = manage ? [...new Set(rows.filter((r) => r.status === "open").map((r) => r.board_id ?? r.committee_id ?? ""))] : [];
  const [profile, ...cvs] = manage ? await Promise.all([companyProfile(supabase), ...openBodies.map((id) => bodyAffiliations(supabase, rows.find((r) => r.board_id === id) ? { board: id } : { committee: id }))]) : [null];
  const cvOf = new Map<string, Affiliation[]>(openBodies.map((id, i) => [id, (cvs[i] as Affiliation[]) ?? []]));
  const bodies = [...(boards ?? []).map((b) => ({ value: `board:${b.id}`, label: b.name })), ...(committees ?? []).map((c) => ({ value: `committee:${c.id}`, label: c.name }))];

  return (
    <>
      <PageHeader section="الحوكمة" title="القرارات بالتمرير" description="قرارات الأمور العاجلة يصوّت عليها الأعضاء كتابةً دون اجتماع، ثم تُثبت في محضر أول اجتماع تالٍ." />
      <RegulationNote
        notes={[
          { source: "نظام الشركات", article: "م82", text: "تصدر بموافقة أغلبية أصوات الأعضاء ما لم يطلب أحدهم كتابةً اجتماع المجلس للمداولة، وتُعرض في أول اجتماع تالٍ لإثباتها في محضره." },
        ]}
      />
      {manage && ((await serviceSettings(supabase)).circular_enabled ? <CircularForm bodies={bodies} /> : <p className="mb-6 rounded-lg border border-dashed border-rule bg-surface p-4 text-sm text-ink-muted">طرح قرارات جديدة بالتمرير موقوف في إعدادات الموقع؛ القرارات المطروحة سابقاً تكمل تصويتها.</p>)}
      <ul className="flex flex-col gap-4">
        {rows.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا توجد قرارات بالتمرير.</li>}
        {rows.map((r, i) => {
          const list = voters[i];
          const result = circularOutcome(list.length, r.votes);
          const me = list.find((v) => v.user_id === viewer.id);
          const myVote = me && r.votes.find((v) => v.person_id === me.person_id)?.vote;
          const voteOf = Object.fromEntries(r.votes.map((v) => [v.person_id, v.vote]));
          const bodyMeetings = (meetings ?? []).filter((m) => (r.board_id ? m.board_id === r.board_id : m.committee_id === r.committee_id));
          return (
            <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={clsx("rounded-full px-2 py-0.5 text-xs", r.status === "passed" ? "bg-primary-soft text-primary" : r.status === "open" ? "bg-brass-soft text-brass" : "bg-paper text-ink-muted")}>{CIRCULAR_STATUS[r.status]}</span>
                <span className="min-w-0 flex-1 font-display text-lg font-bold">{r.title}</span>
                <span className="text-xs text-ink-muted">{(r.board ?? r.committee)?.name}</span>
                {r.deadline && <span className="text-xs text-ink-muted">حتى {formatGregorianDate(new Date(`${r.deadline}T12:00:00Z`))}</span>}
              </div>
              <p className="whitespace-pre-line">{r.text}</p>
              {manage && r.status === "open" &&
                affiliationNotices(`${r.title} ${r.text}`, cvOf.get(r.board_id ?? r.committee_id ?? "") ?? [], profile?.name ?? "").map((a) => (
                  <p key={`${a.name}-${a.organization}`} role="note" className="rounded-md border border-brass bg-brass-soft p-3 text-xs leading-6">
                    مصلحة محتملة: ورد في القرار «{a.organization}»، و{a.name} {a.role} فيها بحسب سيرته الذاتية. إن كانت له مصلحة فيُفصح ولا يشارك في التصويت (نظام الشركات م71).
                  </p>
                ))}
              <p className="text-ink-muted">
                موافق <span className="font-mono">{result.approve}</span> · غير موافق <span className="font-mono">{result.reject}</span> · ممتنع <span className="font-mono">{result.abstain}</span> · لم يصوّت <span className="font-mono">{result.pending}</span> — يصدر بموافقة <span className="font-mono">{result.majority}</span>
              </p>
              {manage && (
                <ul className="flex flex-wrap gap-2 text-xs">
                  {list.map((v) => (
                    <li key={v.person_id} className="rounded-full border border-rule px-2 py-0.5">
                      {v.full_name}: {voteOf[v.person_id] ? VOTES[voteOf[v.person_id] as keyof typeof VOTES] : "—"}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {r.status === "open" && me &&
                  (Object.keys(VOTES) as (keyof typeof VOTES)[]).map((v) => (
                    <ConfirmButton key={v} action={castVote.bind(null, r.id, v)} label={myVote === v ? `✓ ${VOTES[v]}` : VOTES[v]} variant="secondary" confirm={`تصويتك: ${VOTES[v]}؟`} />
                  ))}
                {r.status === "open" && manage && (
                  <>
                    <ConfirmButton action={closeCircular.bind(null, r.id, false)} label="إغلاق التصويت" variant="secondary" confirm="إغلاق التصويت واحتساب النتيجة؟" />
                    <ConfirmButton action={closeCircular.bind(null, r.id, true)} label="سحب" confirm="سحب القرار؟" />
                  </>
                )}
                {r.status === "passed" && (r.ratified_meeting_id ? <span className="text-xs text-primary">أُثبت في محضر الاجتماع</span> : manage && <RatifyForm circularId={r.id} meetings={bodyMeetings.map((m) => ({ id: m.id, label: meetingReference(m.number, m.starts_at) }))} />)}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
