import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseOwnershipNotice, totalPercent, type Holding } from "@/lib/declarations";
import { createClient } from "@/lib/supabase/server";
import { DocChrome } from "../../doc";

export const metadata: Metadata = { title: "إشعار ملكية" };

const box = (on: boolean) => (on ? "☒" : "☐");

function HoldingRows({ rows, reason }: { rows: Holding[]; reason?: boolean }) {
  const list = rows.length ? rows : [{ name: "", id: "", relation: "", shares: "", percent: "" }];
  return (
    <table>
      <thead>
        <tr>
          <th style={{ width: "5%" }}>م</th>
          <th>الاسم</th>
          <th>رقم الهوية / السجل التجاري</th>
          <th>طبيعة العلاقة (المصلحة)</th>
          <th>عدد وفئة الأسهم</th>
          <th>النسبة</th>
          {reason && <th>سبب التغيير</th>}
        </tr>
      </thead>
      <tbody>
        {list.map((h, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{h.name}</td>
            <td dir="ltr">{h.id}</td>
            <td>{h.relation}</td>
            <td>{h.shares}</td>
            <td dir="ltr">{h.percent && `${h.percent}%`}</td>
            {reason && <td>{h.reason}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tadawul's ownership notice, filled from the member's entry, for signature (RLS: the member and board editors). */
export default async function OwnershipPrint({ params }: PageProps<"/print/ownership/[declarationId]">) {
  const { declarationId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("member_declarations").select("data, kind").eq("id", declarationId).maybeSingle();
  const n = data?.kind === "ownership_notice" ? parseOwnershipNotice(data.data) : null;
  if (!n) notFound();
  const pair = (label: string, value: string) => (
    <tr>
      <th style={{ width: "34%" }}>{label}</th>
      <td>{value}</td>
    </tr>
  );

  return (
    <main className="doc">
      <DocChrome bi={false} footer="إشعار ملكية الأوراق المالية" fileName={`إشعار-ملكية-${n.eventDate}`} />
      <h1 className="doc-title">نموذج الإشعار المتعلق بملكية الأوراق المالية</h1>
      <div className="doc-box">
        <p>يقدَّم النموذج بعد توقيعه إلى مجموعة تداول السعودية (إدارة ترخيص الإدراج وحوكمة المصدرين) خلال فترة لا تتجاوز نهاية ثالث يوم تداول يلي تنفيذ الصفقة أو وقوع الحدث، عبر البريد الإلكتروني: Ownership@Tadawul.com.sa. يتحمل الشخص المعني المسؤولية الكاملة عن صحة المعلومات الواردة فيه.</p>
      </div>

      <table>
        <tbody>
          {pair("1. اسم الشخص", n.name)}
          {pair("رقم الهوية / السجل التجاري", n.id)}
          {pair("نوع الإشعار", `${box(n.type === "holder")} مالك أو له مصلحة في (5%) أو أكثر    ${box(n.type === "change")} تغيير المصلحة`)}
          {pair("2. اسم المصدر المدرج الذي تم التملك به", n.issuer)}
          {pair("3. الملكية المباشرة: عدد وفئة الأسهم", n.direct.shares)}
          {pair("النسبة", n.direct.percent && `${n.direct.percent}%`)}
        </tbody>
      </table>

      <h2>4. ما له مصلحة فيه</h2>
      <table>
        <tbody>
          {pair("أ. أسهم مملوكة أو مسيطر عليها من قبل أقرباء الشخص", `${box(n.relatives)} نعم   ${box(!n.relatives)} لا`)}
          {pair("ب. أسهم مملوكة أو مسيطر عليها من قبل شركة يسيطر عليها الشخص", `${box(n.controlled)} نعم   ${box(!n.controlled)} لا`)}
          {pair("ج. أسهم مملوكة أو مسيطر عليها من قبل أشخاص يتصرفون بالاتفاق مع الشخص", `${box(n.concert)} نعم   ${box(!n.concert)} لا`)}
        </tbody>
      </table>
      {(n.relatives || n.controlled || n.concert) && <HoldingRows rows={n.interests} />}
      <table>
        <tbody>{pair("5. النسبة الإجمالية التي يمتلكها أو له مصلحة فيها (3+4)", totalPercent(n) && `${totalPercent(n)}%`)}</tbody>
      </table>

      {n.type === "change" && (
        <>
          <h2>6. تغيير المصلحة</h2>
          <table>
            <tbody>
              {pair("عدد وفئة الأسهم قبل التغيير", n.before.shares)}
              {pair("النسبة قبل التغيير", n.before.percent && `${n.before.percent}%`)}
              {pair("عدد وفئة الأسهم بعد التغيير", n.after.shares)}
              {pair("النسبة بعد التغيير", n.after.percent && `${n.after.percent}%`)}
            </tbody>
          </table>
          <h2>7. تفاصيل تغيير المصلحة</h2>
          <HoldingRows rows={n.changes} reason />
        </>
      )}

      <table>
        <tbody>
          {pair("8. تفاصيل عملية التملك", n.acquisition)}
          {pair("9. مصدر التمويل", n.funding)}
        </tbody>
      </table>

      <h2>10. بيانات الاتصال</h2>
      <table>
        <tbody>
          {pair("اسم الشخص", n.name)}
          {pair("الجوال", n.phone)}
          {pair("البريد الإلكتروني", n.email)}
          {pair("تاريخ التبليغ", n.noticeDate)}
          {pair("تاريخ وقوع الحدث", n.eventDate)}
          {pair("التوقيع", "")}
        </tbody>
      </table>
    </main>
  );
}
