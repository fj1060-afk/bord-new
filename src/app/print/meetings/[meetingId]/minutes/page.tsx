import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { englishDate, ITEM_KINDS_EN, MEETING_MODES_EN, REMARK_KINDS_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES } from "@/lib/meetings";
import { resolutionReference } from "@/lib/minutes";
import { REMARK_KINDS, type RemarkKind } from "@/lib/secretary";
import { BiText, DocChrome, InfoCard, L, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { AttendancePill, H2, MeetingHead, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "محضر الاجتماع" };

type Resolution = { id: string; agenda_item_id: string | null; number: number | null; year: number | null; text: string; text_en: string | null; status: string; votes_for: number | null; votes_against: number | null; votes_abstain: number | null };
type Remark = { id: string; kind: RemarkKind; note: string; resolution_id: string | null; person: { full_name: string; full_name_en: string | null } | null };

function outcome(r: Resolution): [string, string] {
  if (r.status === "rejected") return ["لم يصدر", "Not passed"];
  if (r.status === "deferred") return ["أُجّل", "Deferred"];
  return (r.votes_against ?? 0) === 0 && (r.votes_abstain ?? 0) === 0 ? ["صدر بالإجماع", "Passed unanimously"] : ["صدر بالأغلبية", "Passed by majority"];
}

export default async function MinutesPrint({ params }: PageProps<"/print/meetings/[meetingId]/minutes">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, supabase, bi } = m;
  const { data: minutes } = await supabase.from("minutes").select("id, status, intro, closing, intro_en, closing_en, version").eq("meeting_id", meetingId).maybeSingle();
  if (!minutes) notFound();

  const [{ data: items }, { data: rows }, { data: resolutions }, { data: signers }, { data: signatures }, { data: remarks }, { data: circulars }] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title, title_en, kind, status").eq("meeting_id", meetingId).order("position"),
    supabase.from("minutes_items").select("agenda_item_id, deliberation, deliberation_en").eq("minutes_id", minutes.id),
    supabase.from("resolutions").select("id, agenda_item_id, number, year, text, text_en, status, votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId).order("number"),
    supabase.rpc("minutes_signers", { p_minutes: minutes.id }),
    supabase.from("minutes_signatures").select("person_id, signed_at, method").eq("minutes_id", minutes.id).eq("version", minutes.version),
    supabase.from("minutes_remarks").select("id, kind, note, resolution_id, person:people(full_name, full_name_en)").eq("minutes_id", minutes.id).neq("kind", "comment").order("created_at"),
    supabase.from("circular_resolutions").select("id, title, text, closed_at, votes:circular_votes(vote)").eq("ratified_meeting_id", meetingId),
  ]);
  const notes = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r]));
  const allRemarks = (remarks ?? []) as unknown as Remark[];
  const signed = new Map((signatures ?? []).map((s) => [s.person_id, s]));
  const signerList = (signers ?? []) as { person_id: string; full_name: string }[];
  const chairId = m.members.find((p) => p.position === "chair")?.person_id;
  const roleOf = Object.fromEntries(m.members.map((p) => [p.person_id, bi ? `${p.role} · ${p.roleEn}` : p.role]));
  const start = new Date(meeting.starts_at);
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const mode = meeting.mode as keyof typeof MEETING_MODES;
  const badge =
    minutes.status === "approved"
      ? { label: `معتمد · Approved v${minutes.version}`, tone: "ok" as const }
      : minutes.status === "review"
        ? { label: `بانتظار التوقيع · Pending v${minutes.version}`, tone: "s" as const }
        : { label: "مسودة للمراجعة · Draft", tone: "s" as const };
  const signedLabel = (id: string) => {
    const s = signed.get(id);
    if (!s) return null;
    const ar = s.method === "manual" ? "وُقّع ورقياً" : "✓ وُقّع إلكترونياً";
    return bi ? `${ar} · ${s.method === "manual" ? "Signed on paper" : "Signed electronically"}` : ar;
  };
  const signedOn = (id: string) => (signed.get(id) ? (bi ? englishDate(new Date(signed.get(id)!.signed_at)) : dateParts(new Date(signed.get(id)!.signed_at)).long) : "");
  const recusals = allRemarks.filter((r) => r.kind === "recusal");
  const general = allRemarks.filter((r) => !r.resolution_id);
  const sig = bi ? "التوقيع · Signature" : "التوقيع";

  return (
    <main className="doc">
      <DocChrome bi={bi} footer={`محضر الاجتماع ${ref}${minutes.version ? ` · النسخة ${minutes.version}` : ""}`} />
      <MeetingHead m={m} reference={ref} title={m.isBoard ? "محضر اجتماع مجلس الإدارة" : "محضر اجتماع"} titleEn={m.isBoard ? "Minutes of the Board of Directors Meeting" : "Meeting Minutes"} date={start} badges={[{ label: "سري · Confidential", tone: "c" }, badge]} />
      <InfoCard
        bi={bi}
        date={start}
        dateEn={bi ? englishDate(start) : undefined}
        cells={[
          ["المكان", mode === "virtual" ? "اتصال مرئي" : meeting.location, "Venue", mode === "virtual" ? "Video conference" : meeting.location_en],
          ["بدأ الاجتماع فعلياً", meeting.started_at ? dateParts(new Date(meeting.started_at)).time : null, "Started"],
          ["انتهى الاجتماع فعلياً", meeting.ended_at ? dateParts(new Date(meeting.ended_at)).time : null, "Ended"],
          ["طريقة الانعقاد", MEETING_MODES[mode], "Format", MEETING_MODES_EN[mode]],
          ["رئيس الاجتماع", m.chair, "Chair", m.chairEn],
          ["أمين السر", m.secretary, "Secretary", m.secretaryEn],
        ]}
      />

      <H2 ar="مقدمة الاجتماع" en="Introduction" bi={bi} />
      <BiText ar={minutes.intro} en={minutes.intro_en} bi={bi} />

      <H2 ar="الحضور" en="Attendance" bi={bi} />
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>الاسم</th>
            {bi && <th className="en">Name</th>}
            <th style={{ width: "16%" }}>
              <L as="div" ar="الحضور" en="Status" bi={bi} />
            </th>
            <th style={{ width: "24%" }}>
              <L as="div" ar="ملاحظة" en="Note" bi={bi} />
            </th>
          </tr>
        </thead>
        <tbody>
          {m.members.map((p, i) => {
            const holder = m.status[p.person_id] === "proxy" ? m.holderOf[p.person_id] : undefined;
            return (
              <tr key={p.person_id}>
                <td className="num">{i + 1}</td>
                <td>
                  <b>{p.name}</b>
                  <small>{p.role}</small>
                </td>
                {bi && (
                  <td className="en">
                    <b>{p.nameEn}</b>
                    <small className="en">{p.roleEn}</small>
                  </td>
                )}
                <td>
                  <AttendancePill status={m.status[p.person_id]} bi={bi} />
                </td>
                <td>
                  {holder && `أناب: ${m.names[holder]}`}
                  {bi && holder && <span className="note-en">Proxy: {m.namesEn[holder] || m.names[holder]}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {m.guests.length > 0 && (
        <>
          <H2 ar="المدعوون" en="Invited Guests" bi={bi} />
          <table>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>م</th>
                <th>الاسم</th>
                {bi && <th className="en">Name</th>}
                <th style={{ width: "30%" }}>
                  <L as="div" ar="الجهة / الصفة" en="Title" bi={bi} />
                </th>
                <th style={{ width: "16%" }}>
                  <L as="div" ar="الحضور" en="Status" bi={bi} />
                </th>
              </tr>
            </thead>
            <tbody>
              {m.guests.map((p, i) => (
                <tr key={p.person_id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  {bi && (
                    <td className="en">
                      <b>{p.nameEn}</b>
                    </td>
                  )}
                  <td>{p.job ?? "—"}</td>
                  <td>
                    <AttendancePill status={m.status[p.person_id]} bi={bi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <H2 ar="افتتاح الجلسة وإثبات النصاب" en="Opening and Quorum" bi={bi} />
      <QuorumBox q={m.quorum} bi={bi} />
      <BiText
        bi={bi}
        ar={`وبعد التحقق من ${m.quorum.met ? "اكتمال" : "عدم اكتمال"} النصاب، افتتح رئيس الاجتماع الجلسة، وسأل الأعضاء عن أي تعارض مصالح في بنود الاجتماع${recusals.length ? `، فأفصح ${recusals.map((r) => r.person?.full_name).join(" و")} عن مصلحة في بنود الاجتماع` : "، فلم يُفصح أحد عن تعارض"}، ثم استعرض المجلس جدول الأعمال وأقرّه، وبدأ بمناقشة بنوده على النحو الآتي:`}
        en={`Having confirmed that the quorum was ${m.quorum.met ? "met" : "not met"}, the Chair opened the meeting and asked members to disclose any conflict of interest${recusals.length ? `; ${recusals.map((r) => r.person?.full_name_en || r.person?.full_name).join(" and ")} disclosed an interest` : "; none was disclosed"}. The Board then approved the agenda and discussed its items as follows:`}
      />

      <H2 ar="جدول الأعمال" en="Agenda" bi={bi} />
      <div className={bi ? "doc-bi" : undefined}>
        <ol className="agenda">
          {(items ?? []).map((i) => (
            <li key={i.id}>{i.title}</li>
          ))}
        </ol>
        {bi && (
          <ol className="agenda en" style={{ paddingLeft: 22, paddingRight: 0 }}>
            {(items ?? []).map((i) => (
              <li key={i.id}>{i.title_en || i.title}</li>
            ))}
          </ol>
        )}
      </div>

      <H2 ar="تفاصيل البنود والقرارات" en="Items and Resolutions" bi={bi} />
      {(items ?? []).map((item) => {
        const kind = item.kind as keyof typeof ITEM_KINDS;
        return (
          <section key={item.id} className="doc-item">
            <header>
              <span>
                البند <span className="num">{item.position}</span>: {item.title}
              </span>
              {bi && item.title_en ? (
                <span className="en">
                  Item {item.position}: {item.title_en}
                </span>
              ) : (
                <span className={kind === "decision" ? "pill" : "pill m"}>{bi ? `${ITEM_KINDS[kind]} · ${ITEM_KINDS_EN[kind]}` : ITEM_KINDS[kind]}</span>
              )}
            </header>
            <div>
              <L as="div" className="label" ar="المناقشة" en="Discussion" bi={bi} />
              <BiText bi={bi} ar={notes[item.id]?.deliberation || (item.status === "deferred" ? "أُجّل البند." : "—")} en={notes[item.id]?.deliberation_en} />
              {((resolutions ?? []) as Resolution[])
                .filter((r) => r.agenda_item_id === item.id)
                .map((r) => {
                  const rRemarks = allRemarks.filter((x) => x.resolution_id === r.id);
                  const recused = rRemarks.filter((x) => x.kind === "recusal").length;
                  const [res, resEn] = outcome(r);
                  const no = resolutionReference(r.number, r.year);
                  return (
                    <div key={r.id}>
                      <div className="doc-result">
                        <div className={bi && r.text_en ? "doc-bi" : undefined}>
                          <div>
                            <span className="no">القرار رقم ({no}):</span> {r.text}
                          </div>
                          {bi && r.text_en && (
                            <div className="en">
                              <span className="no">Resolution No. {no}:</span> {r.text_en}
                            </div>
                          )}
                        </div>
                        <div className="doc-votes">
                          {r.votes_for !== null && (
                            <>
                              <span>{bi ? "موافق · For" : "موافق"}: <b>{r.votes_for}</b></span>
                              <span>{bi ? "معارض · Against" : "معارض"}: <b>{r.votes_against ?? 0}</b></span>
                              <span>{bi ? "ممتنع · Abstain" : "ممتنع"}: <b>{r.votes_abstain ?? 0}</b></span>
                            </>
                          )}
                          {recused > 0 && <span>{bi ? "تعارض مصالح · Recused" : "لم يصوّت لتعارض المصالح"}: <b>{recused}</b></span>}
                          <span>
                            {bi ? "النتيجة · Result" : "النتيجة"}: <strong style={{ color: "var(--primary)" }}>{bi ? `${res} · ${resEn}` : res}</strong>
                          </span>
                        </div>
                      </div>
                      {rRemarks.map((x) => (
                        <div key={x.id} className="doc-remark">
                          <b>{bi ? `${REMARK_KINDS[x.kind]} · ${REMARK_KINDS_EN[x.kind]}` : REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note}{" "}
                          <span className="ref">{x.kind === "dissent" ? "(نظام الشركات م79/4)" : x.kind === "recusal" ? "(نظام الشركات م71)" : ""}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </section>
        );
      })}

      {(circulars ?? []).length > 0 && (
        <>
          <H2 ar="القرارات الصادرة بالتمرير" en="Circular Resolutions Recorded" bi={bi} />
          {(circulars ?? []).map((c) => (
            <section key={c.id} className="doc-item">
              <header>
                <span>{c.title}</span>
                <span className="pill b">{bi ? "للإثبات · For the record" : "للإثبات"}</span>
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
          <H2 ar="التحفظات" en="Reservations" bi={bi} />
          {general.map((x) => (
            <div key={x.id} className="doc-remark">
              <b>{REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note}
            </div>
          ))}
        </>
      )}

      <H2 ar="الاختتام" en="Closing" bi={bi} />
      <BiText ar={minutes.closing} en={minutes.closing_en} bi={bi} />

      <div className="doc-lead">
        <div>
          <L ar="رئيس الاجتماع" en="Chair" bi={bi} />
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>
            {sig}
            {chairId && signedLabel(chairId) ? ` · ${signedLabel(chairId)}` : ""}
          </small>
        </div>
        <div>
          <L ar="أمين السر" en="Secretary" bi={bi} />
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>{sig}</small>
        </div>
      </div>

      <H2 ar="توقيع الأعضاء الحاضرين" en="Signatures of Attending Members" bi={bi} />
      <div className="doc-members">
        {signerList
          .filter((s) => s.person_id !== chairId)
          .map((s) => (
            <div key={s.person_id} className="doc-sig">
              <b>{s.full_name}</b>
              {bi && m.namesEn[s.person_id] && <b className="en" style={{ textAlign: "center", fontSize: "9pt" }}>{m.namesEn[s.person_id]}</b>}
              <span>{roleOf[s.person_id] || "عضو"}</span>
              <div className="box">{signedLabel(s.person_id)?.split(" · ")[0]}</div>
              <small>
                {sig}
                {signedOn(s.person_id) ? ` · ${signedOn(s.person_id)}` : ""}
              </small>
            </div>
          ))}
      </div>
      <p className="ref" style={{ marginTop: 8 }}>
        يوقّع المحضر رئيس الاجتماع والأعضاء الحاضرون وأمين السر، ويجوز التوقيع بالوسائل الإلكترونية (نظام الشركات م83).
        {bi && <span className="en" style={{ display: "block" }}>The minutes are signed by the Chair, the attending members and the secretary; electronic signature is permitted (Companies Law Art. 83).</span>}
      </p>
    </main>
  );
}
