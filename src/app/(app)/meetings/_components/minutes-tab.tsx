import Link from "next/link";
import { Printer } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass } from "@/components/ui/styles";
import { formatDateTime } from "@/lib/format";
import { MINUTES_STATUS, RESOLUTION_STATUS, resolutionReference, signatureProgress, type MinutesStatus } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";
import { recordManualSignature, reopenMinutes, sendForSignature } from "../_actions/minutes";
import { loadMinutesGaps } from "../_actions/minutes-check";
import { MinutesRemarks } from "./minutes-remarks";
import { CreateMinutesButton, MinutesEditor, ResolutionForm, SignMinutesButton } from "./minutes-forms";

type Props = {
  meeting: { id: string; starts_at: string; live_status: string };
  items: { id: string; position: number; title: string; kind: string }[];
  viewerId: string;
  organizer: boolean;
};

export async function MinutesTab({ meeting, items, viewerId, organizer }: Props) {
  const supabase = await createClient();
  const { data: minutes } = await supabase
    .from("minutes")
    .select("id, status, intro, closing, intro_en, closing_en, version, approved_at")
    .eq("meeting_id", meeting.id)
    .maybeSingle();

  if (!minutes) {
    return (
      <div className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">
        {meeting.live_status !== "ended" ? (
          <p>يُعد المحضر بعد انتهاء الاجتماع.</p>
        ) : organizer ? (
          <div className="flex flex-col gap-4">
            <p>يُجهَّز المحضر تلقائياً من الحضور وملخصات البنود المسجلة أثناء الانعقاد، ثم تعدّله قبل إرساله للتوقيع.</p>
            <CreateMinutesButton meetingId={meeting.id} />
          </div>
        ) : (
          <p>لم يُرسل المحضر للتوقيع بعد.</p>
        )}
      </div>
    );
  }

  const [{ data: rows }, { data: resolutions }, { data: signers }, { data: signatures }] = await Promise.all([
    supabase.from("minutes_items").select("agenda_item_id, deliberation, deliberation_en").eq("minutes_id", minutes.id),
    supabase.from("resolutions").select("id, agenda_item_id, number, year, text, text_en, status, votes_for, votes_against, votes_abstain").eq("meeting_id", meeting.id).order("number"),
    supabase.rpc("minutes_signers", { p_minutes: minutes.id }),
    supabase.from("minutes_signatures").select("person_id, signed_at, method").eq("minutes_id", minutes.id).eq("version", minutes.version),
  ]);
  const status = minutes.status as MinutesStatus;
  const deliberation = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation]));
  const deliberationEn = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation_en]));
  const signerList = (signers ?? []) as { person_id: string; user_id: string | null; full_name: string }[];
  const progress = signatureProgress(signerList, signatures ?? []);
  const signedAt = Object.fromEntries((signatures ?? []).map((s) => [s.person_id, s.signed_at]));
  const manual = new Set((signatures ?? []).filter((s) => s.method === "manual").map((s) => s.person_id));
  const mySigner = signerList.find((s) => s.user_id === viewerId);
  const editable = organizer && status === "draft";
  const gaps = editable ? await loadMinutesGaps(supabase, meeting.id, minutes.id) : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-6">
        {editable ? (
          <section className="rounded-lg border border-rule bg-surface p-5">
            <MinutesEditor
              meetingId={meeting.id}
              minutesId={minutes.id}
              intro={minutes.intro}
              closing={minutes.closing}
              introEn={minutes.intro_en}
              closingEn={minutes.closing_en}
              items={items.map((i) => ({ ...i, deliberation: deliberation[i.id] ?? null, deliberation_en: deliberationEn[i.id] ?? null }))}
            />
          </section>
        ) : (
          <article className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-6 leading-8">
            <p className="whitespace-pre-line">{minutes.intro}</p>
            {items.map((i) => (
              <section key={i.id}>
                <h3 className="font-display font-bold">
                  <span className="font-mono text-brass">{i.position}.</span> {i.title}
                </h3>
                <p className="whitespace-pre-line text-sm">{deliberation[i.id] || "—"}</p>
              </section>
            ))}
            <p className="whitespace-pre-line">{minutes.closing}</p>
          </article>
        )}

        <section>
          <h2 className="mb-3 font-display text-xl font-bold">القرارات</h2>
          <ul className="flex flex-col gap-4">
            {items.map((item) => {
              const itemResolutions = (resolutions ?? []).filter((r) => r.agenda_item_id === item.id);
              if (!editable && itemResolutions.length === 0) return null;
              return (
                <li key={item.id} className="rounded-lg border border-rule bg-surface p-5">
                  <p className="mb-3 text-sm text-ink-muted">
                    البند {item.position}: {item.title}
                  </p>
                  {itemResolutions.map((r) => (
                    <div key={r.id} className="mb-3 flex flex-col gap-2">
                      <p className="text-sm">
                        <Link href={`/resolutions/${r.id}`} className="font-mono text-primary hover:underline">
                          قرار {resolutionReference(r.number, r.year)}
                        </Link>{" "}
                        · {RESOLUTION_STATUS[r.status as keyof typeof RESOLUTION_STATUS]}
                        {r.votes_for !== null && ` · موافق ${r.votes_for} / معارض ${r.votes_against ?? 0} / ممتنع ${r.votes_abstain ?? 0}`}
                      </p>
                      {editable ? <ResolutionForm meetingId={meeting.id} agendaItemId={item.id} resolution={r} /> : <p className="whitespace-pre-line">{r.text}</p>}
                    </div>
                  ))}
                  {editable && (
                    <details>
                      <summary className="cursor-pointer text-sm text-primary">تسجيل قرار على هذا البند</summary>
                      <div className="mt-3">
                        <ResolutionForm meetingId={meeting.id} agendaItemId={item.id} />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
            {!editable && (resolutions ?? []).length === 0 && <li className="text-sm text-ink-muted">لا توجد قرارات.</li>}
          </ul>
        </section>

        <MinutesRemarks
          meetingId={meeting.id}
          minutesId={minutes.id}
          status={status}
          organizer={organizer}
          canComment={!!mySigner}
          resolutions={(resolutions ?? []).map((r) => ({ id: r.id, label: `قرار ${resolutionReference(r.number, r.year)}` }))}
          people={signerList.map((s) => ({ id: s.person_id, name: s.full_name }))}
        />
      </div>

      <aside className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5 text-sm">
          <p>
            الحالة: <strong>{MINUTES_STATUS[status]}</strong>
            {minutes.version > 0 && <span className="text-ink-muted"> · النسخة {minutes.version}</span>}
          </p>
          {minutes.approved_at && <p className="text-ink-muted">اعتُمد {formatDateTime(new Date(minutes.approved_at))}</p>}
          <Link href={`/print/meetings/${meeting.id}/minutes`} target="_blank" className={buttonClass("secondary", "w-full")}>
            <Printer size={16} aria-hidden="true" /> طباعة المحضر
          </Link>
          {editable && gaps.length > 0 && (
            <div role="alert" className="rounded-md bg-danger/5 p-3 text-danger">
              <p className="mb-1 font-medium">قبل الإرسال للتوقيع:</p>
              <ul className="list-disc ps-5">
                {gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-ink-muted">الحد الأدنى لمحتوى المحضر حسب الدليل الاسترشادي لأمين السر.</p>
            </div>
          )}
          {organizer && status === "draft" && gaps.length === 0 && (
            <ConfirmButton
              action={sendForSignature.bind(null, meeting.id, minutes.id)}
              label="إرسال للتوقيع"
              variant="secondary"
              confirm="تجميد هذه النسخة وإرسالها للأعضاء الحاضرين للتوقيع؟"
            />
          )}
          {organizer && status === "review" && (
            <ConfirmButton action={reopenMinutes.bind(null, meeting.id, minutes.id)} label="إعادة للتعديل" confirm="إعادة المحضر لمسودة؟ يلزم توقيع النسخة الجديدة من جديد." />
          )}
        </div>

        {status !== "draft" && (
          <div className="rounded-lg border border-rule bg-surface p-5 text-sm">
            <p className="mb-3 font-medium">
              التوقيعات <span className="font-mono">{progress.signed}</span> من <span className="font-mono">{progress.total}</span>
            </p>
            <ul className="mb-4 flex flex-col gap-2">
              {signerList.map((s) => (
                <li key={s.person_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{s.full_name}</span>
                  <span className={signedAt[s.person_id] ? "text-primary" : "text-ink-muted"}>
                    {signedAt[s.person_id] ? (manual.has(s.person_id) ? "وقّع ورقياً" : "وقّع") : "بانتظار"}
                  </span>
                  {organizer && status === "review" && !signedAt[s.person_id] && (
                    <ConfirmButton
                      action={recordManualSignature.bind(null, meeting.id, minutes.id, s.person_id)}
                      label="تسجيل توقيع ورقي"
                      variant="secondary"
                      confirm={`تأكيد أن ${s.full_name} وقّع نسخة المحضر الورقية؟`}
                    />
                  )}
                </li>
              ))}
            </ul>
            {status === "review" && mySigner && !signedAt[mySigner.person_id] && <SignMinutesButton meetingId={meeting.id} minutesId={minutes.id} />}
          </div>
        )}
      </aside>
    </div>
  );
}
