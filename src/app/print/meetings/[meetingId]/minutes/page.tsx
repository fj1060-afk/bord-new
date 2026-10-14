import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMinutesGaps } from "@/app/(app)/meetings/_actions/minutes-check";
import { CATEGORIES_EN, englishDate, ITEM_KINDS_EN, REMARK_KINDS_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS } from "@/lib/meetings";
import { resolutionReference } from "@/lib/minutes";
import { BOARD_CATEGORIES } from "@/lib/org";
import { REMARK_KINDS, voteTally, type RemarkKind } from "@/lib/secretary";
import { BiText, DocChrome, InfoCard, L, PersonCell, reference, Signatures, type Signer } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { Capacity, H2, heldCells, heldDay, MeetingHead, Method, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "محضر الاجتماع" };

type Resolution = { id: string; agenda_item_id: string | null; number: number | null; year: number | null; text: string; text_en: string | null; status: string; votes_for: number | null; votes_against: number | null; votes_abstain: number | null };
type Remark = { id: string; kind: RemarkKind; note: string; resolution_id: string | null; person: { full_name: string; full_name_en: string | null } | null };

export default async function MinutesPrint({ params }: PageProps<"/print/meetings/[meetingId]/minutes">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, supabase, bi } = m;
  const { data: minutes } = await supabase.from("minutes").select("id, status, intro, closing, intro_en, closing_en, version").eq("meeting_id", meetingId).maybeSingle();
  if (!minutes) notFound();

  const [{ data: items }, { data: rows }, { data: resolutions }, { data: signers }, { data: signatures }, { data: remarks }, { data: circulars }, gaps] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title, title_en, kind, status").eq("meeting_id", meetingId).order("position"),
    supabase.from("minutes_items").select("agenda_item_id, deliberation, deliberation_en").eq("minutes_id", minutes.id),
    supabase.from("resolutions").select("id, agenda_item_id, number, year, text, text_en, status, votes_for, votes_against, votes_abstain").eq("meeting_id", meetingId).order("number"),
    supabase.rpc("minutes_signers", { p_minutes: minutes.id }),
    supabase.from("minutes_signatures").select("person_id, signed_at, method").eq("minutes_id", minutes.id).eq("version", minutes.version),
    supabase.from("minutes_remarks").select("id, kind, note, resolution_id, person:people(full_name, full_name_en)").eq("minutes_id", minutes.id).neq("kind", "comment").order("created_at"),
    supabase.from("circular_resolutions").select("id, title, text, closed_at, votes:circular_votes(vote)").eq("ratified_meeting_id", meetingId),
    loadMinutesGaps(supabase, meetingId, minutes.id),
  ]);
  const notes = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r]));
  const allRemarks = (remarks ?? []) as unknown as Remark[];
  const signed = new Map((signatures ?? []).map((s) => [s.person_id, s]));
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const heldOn = m.held.toISOString().slice(0, 10);
  const early = (signatures ?? []).filter((s) => s.signed_at.slice(0, 10) < heldOn).length;
  const warnings = [...gaps, ...(early ? [`${early} توقيع مؤرخ قبل تاريخ انعقاد الاجتماع.`] : [])];
  const recusals = allRemarks.filter((r) => r.kind === "recusal");
  const general = allRemarks.filter((r) => !r.resolution_id);
  const status =
    minutes.status === "approved"
      ? { ar: `معتمد · الإصدار ${minutes.version}`, en: `Approved · v${minutes.version}`, tone: "ok" as const }
      : minutes.status === "review"
        ? { ar: `بانتظار التوقيع · الإصدار ${minutes.version}`, en: `Awaiting signature · v${minutes.version}`, tone: "s" as const }
        : { ar: "مسودة", en: "Draft", tone: "s" as const };
  const th = (ar: string, en: string, width?: string) => (
    <th style={width ? { width } : undefined}>
      <L as="div" ar={ar} en={en} bi={bi} />
    </th>
  );
  const signer = (personId: string | undefined, role: string, roleEn: string, name: string, nameEn: string): Signer => {
    const s = personId ? signed.get(personId) : undefined;
    return {
      role,
      roleEn,
      name,
      nameEn,
      status: s ? (s.method === "manual" ? "وُقّع ورقياً" : "وُقّع إلكترونياً") : undefined,
      statusEn: s ? (s.method === "manual" ? "Signed on paper" : "Signed electronically") : undefined,
      date: s ? dateParts(new Date(s.signed_at)).long : undefined,
      dateEn: s ? englishDate(new Date(s.signed_at)) : undefined,
    };
  };
  const chair = m.members.find((p) => p.position === "chair");
  const signerIds = ((signers ?? []) as { person_id: string }[]).map((s) => s.person_id);
  const memberSigners = m.members.filter((p) => signerIds.includes(p.person_id) && p.person_id !== chair?.person_id);

  return (
    <main className="doc">
      <DocChrome bi={bi} footer={minutes.version ? `${ref} · ${bi ? "v" : "الإصدار "}${minutes.version}` : `${ref} · ${bi ? "Draft" : "مسودة"}`} note={warnings.length ? <ul className="list-disc ps-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul> : null} />
      <MeetingHead m={m} title={m.isBoard ? "محضر اجتماع مجلس الإدارة" : "محضر اجتماع"} titleEn={m.isBoard ? "Minutes of the Board of Directors Meeting" : "Meeting Minutes"} badges={[{ ar: "سري", en: "Confidential", tone: "c" }, status]} />
      <InfoCard bi={bi} day={heldDay(m)} cells={heldCells(m)} />

      <H2 ar="الحضور" en="Attendance" bi={bi} />
      <table>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>م</th>
            {th("الاسم والصفة", "Name and position", "46%")}
            {th("الحضور", "Attendance", "15%")}
            {th("الطريقة", "Method", "11%")}
            {th("ملاحظة", "Note", "24%")}
          </tr>
        </thead>
        <tbody>
          {m.members.map((p, i) => {
            const category = p.category as keyof typeof BOARD_CATEGORIES | null;
            const holder = m.status[p.person_id] === "proxy" ? m.holderOf[p.person_id] : undefined;
            return (
              <tr key={p.person_id}>
                <td className="num">{i + 1}</td>
                <td>
                  <PersonCell bi={bi} name={p.name} nameEn={p.nameEn} role={category ? `${p.role} · ${BOARD_CATEGORIES[category]}` : p.role} roleEn={category ? `${p.roleEn} · ${CATEGORIES_EN[category]}` : p.roleEn} />
                </td>
                <td>
                  <Capacity status={m.status[p.person_id]} bi={bi} />
                </td>
                <td>
                  <Method status={m.status[p.person_id]} bi={bi} />
                </td>
                <td>
                  {holder && `أناب: ${m.names[holder]}`}
                  {bi && holder && <span className="note-en">Proxy holder: {m.namesEn[holder] || m.names[holder]}</span>}
                </td>
              </tr>
            );
          })}
          {m.guests.map((p) => (
            <tr key={p.person_id}>
              <td className="ref">—</td>
              <td>
                <PersonCell bi={bi} name={p.name} nameEn={p.nameEn} role={`مدعو${p.job ? ` · ${p.job}` : ""}`} roleEn="Invited guest" />
              </td>
              <td>{m.status[p.person_id] === "present" || m.status[p.person_id] === "remote" ? <span className="pill">{bi ? "حاضر · Present" : "حاضر"}</span> : <Capacity status={m.status[p.person_id]} bi={bi} />}</td>
              <td>
                <Method status={m.status[p.person_id]} bi={bi} />
              </td>
              <td />
            </tr>
          ))}
        </tbody>
      </table>

      <section className="keep">
        <H2 ar="النصاب وافتتاح الجلسة" en="Quorum and Opening" bi={bi} />
        <QuorumBox q={m.quorum} bi={bi} />
        <BiText bi={bi} ar={minutes.intro} en={minutes.intro_en} />
        <BiText
          bi={bi}
          ar={`وسأل رئيس الاجتماع الأعضاء عن أي تعارض مصالح في بنود الاجتماع${recusals.length ? `، فأفصح ${recusals.map((r) => r.person?.full_name).join(" و")} عن مصلحة، وامتنع عن التصويت على ما يخصه` : "، فلم يُفصح أحد عن تعارض"}.`}
          en={`The Chair asked members to disclose any conflict of interest${recusals.length ? `; ${recusals.map((r) => r.person?.full_name_en || r.person?.full_name).join(" and ")} disclosed an interest and abstained on the related item` : "; none was disclosed"}.`}
        />
      </section>

      <H2 ar="البنود والقرارات" en="Items and Resolutions" bi={bi} />
      {(items ?? []).map((item) => {
        const kind = item.kind as keyof typeof ITEM_KINDS;
        const note = notes[item.id];
        return (
          <section key={item.id} className="doc-item">
            <header>
              <L
                as="div"
                bi={bi}
                ar={
                  <>
                    البند <span className="num">{item.position}</span>: {item.title} <span className={kind === "decision" ? "pill" : "pill m"}>{item.status === "deferred" ? "مؤجل" : ITEM_KINDS[kind]}</span>
                  </>
                }
                en={
                  <>
                    Item {item.position}: {item.title_en?.trim() || <span className="missing">—</span>} <span className="pill m">{item.status === "deferred" ? "Deferred" : ITEM_KINDS_EN[kind]}</span>
                  </>
                }
              />
            </header>
            <div>
              <L as="div" className="label" ar="المناقشة" en="Discussion" bi={bi} />
              <BiText bi={bi} ar={note?.deliberation || (item.status === "deferred" ? "أُجّل البند." : "—")} en={note?.deliberation_en || (item.status === "deferred" ? "The item was deferred." : null)} />
              {((resolutions ?? []) as Resolution[])
                .filter((r) => r.agenda_item_id === item.id)
                .map((r) => {
                  const rRemarks = allRemarks.filter((x) => x.resolution_id === r.id);
                  const recused = rRemarks.filter((x) => x.kind === "recusal").length;
                  const tally = voteTally(r, m.quorum.counted, recused);
                  const passed = r.status === "approved";
                  const [res, resEn] = r.status === "rejected" ? ["لم يصدر", "Not passed"] : r.status === "deferred" ? ["أُجّل", "Deferred"] : tally.unanimous ? ["صدر بالإجماع", "Passed unanimously"] : ["صدر بالأغلبية", "Passed by majority"];
                  const no = resolutionReference(r.number, r.year);
                  const voted = r.votes_for !== null;
                  return (
                    <div key={r.id}>
                      <div className="doc-result">
                        <BiText
                          bi={bi}
                          ar={
                            <>
                              <span className="no">القرار رقم ({no}):</span> {r.text}
                            </>
                          }
                          en={r.text_en ? `Resolution No. ${no}: ${r.text_en}` : null}
                        />
                        <div className={bi ? "doc-bi" : undefined}>
                          <div className="doc-votes">
                            {voted && (
                              <>
                                <span>موافق <b>{r.votes_for}</b></span>
                                <span>معارض <b>{r.votes_against ?? 0}</b></span>
                                <span>ممتنع <b>{r.votes_abstain ?? 0}</b></span>
                                <span>من <b>{tally.eligible}</b> صوتاً محتسباً{m.quorum.byProxy ? " (تشمل الإنابة)" : ""}</span>
                              </>
                            )}
                            {recused > 0 && <span>امتنع لتعارض المصالح <b>{recused}</b></span>}
                            <strong style={{ color: passed ? "var(--primary)" : "var(--danger)" }}>{res}</strong>
                          </div>
                          {bi && (
                            <div className="doc-votes en">
                              {voted && (
                                <>
                                  <span>For <b>{r.votes_for}</b></span>
                                  <span>Against <b>{r.votes_against ?? 0}</b></span>
                                  <span>Abstain <b>{r.votes_abstain ?? 0}</b></span>
                                  <span>of <b>{tally.eligible}</b> eligible votes{m.quorum.byProxy ? " (incl. proxies)" : ""}</span>
                                </>
                              )}
                              {recused > 0 && <span>Recused <b>{recused}</b></span>}
                              <strong style={{ color: passed ? "var(--primary)" : "var(--danger)" }}>{resEn}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                      {rRemarks.map((x) => (
                        <div key={x.id} className={bi ? "doc-bi" : undefined}>
                          <div className="doc-remark">
                            <b>{REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note} <span className="ref">{x.kind === "dissent" ? "(نظام الشركات م79/4)" : x.kind === "recusal" ? "(نظام الشركات م71)" : ""}</span>
                          </div>
                          {bi && (
                            <div className="doc-remark en">
                              <b>{REMARK_KINDS_EN[x.kind]}:</b> {x.person?.full_name_en || x.person?.full_name} <span className="missing">(statement recorded in Arabic)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>
          </section>
        );
      })}

      {(circulars ?? []).map((c) => (
        <section key={c.id} className="doc-item">
          <header>
            <L as="div" bi={bi} ar={`إثبات قرار بالتمرير: ${c.title}`} en="Circular resolution recorded" />
          </header>
          <div>
            <BiText
              bi={bi}
              ar={`أثبت المجلس القرار الصادر بالتمرير${c.closed_at ? ` بتاريخ ${dateParts(new Date(c.closed_at)).long}` : ""} بموافقة ${c.votes.filter((v) => v.vote === "approve").length} من الأعضاء (نظام الشركات م82): ${c.text}`}
              en={`The Board recorded the resolution passed by circulation${c.closed_at ? ` on ${englishDate(new Date(c.closed_at))}` : ""} with ${c.votes.filter((v) => v.vote === "approve").length} approvals (Companies Law Art. 82).`}
            />
          </div>
        </section>
      ))}

      {general.map((x) => (
        <div key={x.id} className="doc-remark">
          <b>{REMARK_KINDS[x.kind]}:</b> {x.person?.full_name} — {x.note}
        </div>
      ))}

      <H2 ar="الاختتام" en="Closing" bi={bi} />
      <BiText bi={bi} ar={minutes.closing} en={minutes.closing_en} />

      <section>
        <H2 ar="التوقيعات" en="Signatures" bi={bi} />
        <Signatures
          bi={bi}
          signers={[
            signer(chair?.person_id, "رئيس الاجتماع", "Chair", m.chair, m.chairEn),
            signer(undefined, "أمين السر", "Secretary", m.secretary, m.secretaryEn),
            ...memberSigners.map((p) => signer(p.person_id, p.role || "عضو", p.roleEn || "Member", p.name, p.nameEn)),
          ]}
        />
        <BiText bi={bi} ar="يوقّع المحضر رئيس الاجتماع والأعضاء الحاضرون وأمين السر، ويجوز التوقيع إلكترونياً (نظام الشركات م83)." en="Signed by the Chair, the attending members and the secretary; electronic signature is permitted (Companies Law Art. 83)." />
      </section>
    </main>
  );
}
