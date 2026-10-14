import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES } from "@/lib/meetings";
import { resolutionReference } from "@/lib/minutes";
import { REMARK_KINDS, type RemarkKind } from "@/lib/secretary";
import { DocChrome, DocHead, DocTitle, InfoCard, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { AttendancePill, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "محضر الاجتماع" };

type Resolution = { id: string; agenda_item_id: string | null; number: number | null; year: number | null; text: string; status: string; votes_for: number | null; votes_against: number | null; votes_abstain: number | null };
type Remark = { id: string; kind: RemarkKind; note: string; resolution_id: string | null; person: { full_name: string } | null };

function outcome(r: Resolution) {
  if (r.status === "rejected") return "لم يصدر";
  if (r.status === "deferred") return "أُجّل";
  return (r.votes_against ?? 0) === 0 && (r.votes_abstain ?? 0) === 0 ? "صدر بالإجماع" : "صدر بالأغلبية";
}

export default async function MinutesPrint({ params }: PageProps<"/print/meetings/[meetingId]/minutes">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, supabase } = m;
  const { data: minutes } = await supabase.from("minutes").select("id, status, intro, closing, version").eq("meeting_id", meetingId).maybeSingle();
  if (!minutes) notFound();

  const [{ data: items }, { data: rows }, { data: resolutions }, { data: signers }, { data: signatures }, { data: remarks }, { data: circulars }] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title, kind, status").eq("meeting_id", meetingId).order("position"),
    supabase.from("minutes_items").select("agenda_item_id, deliberation").eq("minutes_id", minutes.id),
    supabase.from("resolutions").select("id, agenda_item_id, number, year, text, status, votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId).order("number"),
    supabase.rpc("minutes_signers", { p_minutes: minutes.id }),
    supabase.from("minutes_signatures").select("person_id, signed_at, method").eq("minutes_id", minutes.id).eq("version", minutes.version),
    supabase.from("minutes_remarks").select("id, kind, note, resolution_id, person:people(full_name)").eq("minutes_id", minutes.id).neq("kind", "comment").order("created_at"),
    supabase.from("circular_resolutions").select("id, title, text, closed_at, votes:circular_votes(vote)").eq("ratified_meeting_id", meetingId),
  ]);
  const deliberation = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation]));
  const allRemarks = (remarks ?? []) as unknown as Remark[];
  const signed = new Map((signatures ?? []).map((s) => [s.person_id, s]));
  const signerList = (signers ?? []) as { person_id: string; full_name: string }[];
  const chairId = m.members.find((p) => p.position === "chair")?.person_id;
  const roleOf = Object.fromEntries(m.members.map((p) => [p.person_id, p.role]));
  const start = new Date(meeting.starts_at);
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const badge =
    minutes.status === "approved"
      ? { label: `معتمد · النسخة ${minutes.version}`, tone: "ok" as const }
      : minutes.status === "review"
        ? { label: `بانتظار التوقيع · النسخة ${minutes.version}`, tone: "s" as const }
        : { label: "مسودة للمراجعة", tone: "s" as const };
  const signatureNote = (id: string) => {
    const s = signed.get(id);
    return s ? `${s.method === "manual" ? "وُقّع ورقياً" : "✓ وُقّع إلكترونياً"} · ${dateParts(new Date(s.signed_at)).long}` : null;
  };
  const recusals = allRemarks.filter((r) => r.kind === "recusal");
  const general = allRemarks.filter((r) => !r.resolution_id);

  return (
    <main className="doc">
      <DocChrome footer={`محضر الاجتماع ${ref}${minutes.version ? ` · النسخة ${minutes.version}` : ""}`} />
      <DocHead company={m.company} issuer={m.isBoard ? "أمانة سر مجلس الإدارة" : `أمانة سر ${m.body}`} reference={ref} date={start} badges={[{ label: "سري", tone: "c" }, badge]} />
      <DocTitle title="محضر اجتماع" subtitle={<>{m.body} - الاجتماع رقم (<span className="num">{meeting.number}</span>) لعام <span className="num">{meeting.starts_at.slice(0, 4)}</span></>} />
      <InfoCard
        date={start}
        cells={[
          ["المكان", meeting.mode === "virtual" ? "اتصال مرئي" : meeting.location],
          ["بدأ الاجتماع فعلياً", meeting.started_at ? dateParts(new Date(meeting.started_at)).time : null],
          ["انتهى الاجتماع فعلياً", meeting.ended_at ? dateParts(new Date(meeting.ended_at)).time : null],
          ["طريقة الانعقاد", MEETING_MODES[meeting.mode as keyof typeof MEETING_MODES]],
          ["رئيس الاجتماع", m.chair],
          ["أمين السر", m.secretary],
        ]}
      />

      <h2>مقدمة الاجتماع</h2>
      <p style={{ whiteSpace: "pre-line" }}>{minutes.intro}</p>

      <h2>الحضور</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>الاسم</th>
            <th style={{ width: "15%" }}>الحضور</th>
            <th style={{ width: "28%" }}>ملاحظة</th>
          </tr>
        </thead>
        <tbody>
          {m.members.map((p, i) => (
            <tr key={p.person_id}>
              <td className="num">{i + 1}</td>
              <td>
                <b>{p.name}</b>
                <small>{p.role}</small>
              </td>
              <td>
                <AttendancePill status={m.status[p.person_id]} />
              </td>
              <td>{m.status[p.person_id] === "proxy" && m.holderOf[p.person_id] ? `أناب: ${m.names[m.holderOf[p.person_id]]}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {m.guests.length > 0 && (
        <>
          <h2>المدعوون</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>م</th>
                <th>الاسم</th>
                <th style={{ width: "38%" }}>الجهة / الصفة</th>
                <th style={{ width: "15%" }}>الحضور</th>
              </tr>
            </thead>
            <tbody>
              {m.guests.map((p, i) => (
                <tr key={p.person_id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td>{p.job ?? "—"}</td>
                  <td>
                    <AttendancePill status={m.status[p.person_id]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>افتتاح الجلسة وإثبات النصاب</h2>
      <QuorumBox q={m.quorum} />
      <p>
        وبعد التحقق من {m.quorum.met ? "اكتمال" : "عدم اكتمال"} النصاب، افتتح رئيس الاجتماع الجلسة، وسأل الأعضاء عن أي تعارض مصالح في بنود الاجتماع
        {recusals.length ? `، فأفصح ${recusals.map((r) => r.person?.full_name).join(" و")} عن مصلحة في بنود الاجتماع` : "، فلم يُفصح أحد عن تعارض"}، ثم استعرض المجلس جدول الأعمال وأقرّه، وبدأ بمناقشة بنوده على النحو الآتي:
      </p>

      <h2>جدول الأعمال</h2>
      <ol className="agenda">
        {(items ?? []).map((i) => (
          <li key={i.id}>{i.title}</li>
        ))}
      </ol>

      <h2>تفاصيل البنود والقرارات</h2>
      {(items ?? []).map((item) => (
        <section key={item.id} className="doc-item">
          <header>
            <span>
              البند <span className="num">{item.position}</span>: {item.title}
            </span>
            <span className={item.kind === "decision" ? "pill" : "pill m"}>{ITEM_KINDS[item.kind as keyof typeof ITEM_KINDS]}</span>
          </header>
          <div>
            <div className="label">المناقشة</div>
            <p style={{ whiteSpace: "pre-line" }}>{deliberation[item.id] || (item.status === "deferred" ? "أُجّل البند." : "—")}</p>
            {((resolutions ?? []) as Resolution[])
              .filter((r) => r.agenda_item_id === item.id)
              .map((r) => {
                const rRemarks = allRemarks.filter((x) => x.resolution_id === r.id);
                const recused = rRemarks.filter((x) => x.kind === "recusal").length;
                return (
                  <div key={r.id}>
                    <div className="doc-result">
                      <span className="no">القرار رقم ({resolutionReference(r.number, r.year)}):</span> {r.text}
                      <div className="doc-votes">
                        {r.votes_for !== null && (
                          <>
                            <span>موافق: <b>{r.votes_for}</b></span>
                            <span>معارض: <b>{r.votes_against ?? 0}</b></span>
                            <span>ممتنع: <b>{r.votes_abstain ?? 0}</b></span>
                          </>
                        )}
                        {recused > 0 && <span>لم يصوّت: <b>{recused}</b> لتعارض المصالح</span>}
                        <span>النتيجة: <strong style={{ color: "var(--primary)" }}>{outcome(r)}</strong></span>
                      </div>
                    </div>
                    {rRemarks.map((x) => (
                      <div key={x.id} className="doc-remark">
                        <b>{REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note}{" "}
                        <span className="ref">{x.kind === "dissent" ? "(نظام الشركات م79/4)" : x.kind === "recusal" ? "(نظام الشركات م71)" : ""}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      {(circulars ?? []).length > 0 && (
        <>
          <h2>القرارات الصادرة بالتمرير</h2>
          {(circulars ?? []).map((c) => (
            <section key={c.id} className="doc-item">
              <header>
                <span>{c.title}</span>
                <span className="pill b">للإثبات</span>
              </header>
              <div>
                <p>
                  أثبت المجلس القرار الصادر بالتمرير{c.closed_at ? ` بتاريخ ${dateParts(new Date(c.closed_at)).long}م` : ""}، والذي صدر بموافقة{" "}
                  <span className="num">{c.votes.filter((v) => v.vote === "approve").length}</span> من الأعضاء <span className="ref">(نظام الشركات م82)</span>: {c.text}
                </p>
              </div>
            </section>
          ))}
        </>
      )}

      {general.length > 0 && (
        <>
          <h2>التحفظات</h2>
          {general.map((x) => (
            <div key={x.id} className="doc-remark">
              <b>{REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note}
            </div>
          ))}
        </>
      )}

      <h2>الاختتام</h2>
      <p style={{ whiteSpace: "pre-line" }}>{minutes.closing}</p>

      <div className="doc-lead">
        <div>
          <span>رئيس الاجتماع</span>
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>التوقيع{chairId && signatureNote(chairId) ? ` · ${signatureNote(chairId)}` : ""}</small>
        </div>
        <div>
          <span>أمين السر</span>
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>التوقيع</small>
        </div>
      </div>

      <h2>توقيع الأعضاء الحاضرين</h2>
      <div className="doc-members">
        {signerList
          .filter((s) => s.person_id !== chairId)
          .map((s) => (
            <div key={s.person_id} className="doc-sig">
              <b>{s.full_name}</b>
              <span>{roleOf[s.person_id] || "عضو"}</span>
              <div className="box">{signatureNote(s.person_id)?.split(" · ")[0]}</div>
              <small>التوقيع{signed.get(s.person_id) ? ` · ${dateParts(new Date(signed.get(s.person_id)!.signed_at)).long}` : ""}</small>
            </div>
          ))}
      </div>
      <p className="ref" style={{ marginTop: 8 }}>
        يوقّع المحضر رئيس الاجتماع والأعضاء الحاضرون وأمين السر، ويجوز التوقيع بالوسائل الإلكترونية (نظام الشركات م83).
      </p>
    </main>
  );
}
