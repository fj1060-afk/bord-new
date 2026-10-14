import type { ReactNode } from "react";
import { PrintButton } from "./print-button";

// Building blocks of printed governance documents. In bilingual mode every
// label and value pairs Arabic (start/right) with English (end/left).

export type Badge = { ar: string; en: string; tone: "c" | "s" | "ok" };

/** Arabic, with its English counterpart on the end side when bilingual. */
export function L({ ar, en, bi, as: Tag = "span", className }: { ar: ReactNode; en?: ReactNode; bi: boolean; as?: "span" | "div" | "h2" | "b"; className?: string }) {
  if (!bi) return <Tag className={className}>{ar}</Tag>;
  return (
    <Tag className={`pair ${className ?? ""}`}>
      <span>{ar}</span>
      <span className="en">{en ?? ""}</span>
    </Tag>
  );
}

const MISSING = <span className="missing">English translation not provided.</span>;

/** Long text: Arabic, and in bilingual mode its English translation beside it. */
export function BiText({ ar, en, bi }: { ar: ReactNode; en?: string | null; bi: boolean }) {
  if (!bi) return <p className="pre">{ar}</p>;
  return (
    <div className="doc-bi">
      <p className="pre">{ar}</p>
      <p className="en pre">{en?.trim() ? en : MISSING}</p>
    </div>
  );
}

/** Letterhead: company and issuer; status badges beneath (Arabic right, English left). No dates or references: those live in the card and footer. */
export function DocHead({ company, companyEn, issuer, issuerEn, badges, bi }: { company: string; companyEn: string; issuer: string; issuerEn: string; badges: Badge[]; bi: boolean }) {
  const row = (lang: "ar" | "en") =>
    badges.map((b) => (
      <span key={b.ar} className={`doc-badge ${b.tone}`}>
        {lang === "ar" ? b.ar : b.en}
      </span>
    ));
  return (
    <header className="doc-head">
      <div className="doc-head-row">
        <div>
          <b className="org">{company}</b>
          <span>{issuer}</span>
        </div>
        <div className="doc-seal">م</div>
        <div className={bi ? "en" : "doc-badges"}>
          {bi ? (
            <>
              <b className="org">{companyEn || company}</b>
              <span>{issuerEn}</span>
            </>
          ) : (
            row("ar")
          )}
        </div>
      </div>
      {bi && (
        <div className="doc-badge-row">
          <span className="doc-badges">{row("ar")}</span>
          <span className="doc-badges en">{row("en")}</span>
        </div>
      )}
    </header>
  );
}

export function DocTitle({ title, titleEn, subtitle, subtitleEn, bi }: { title: string; titleEn: string; subtitle: ReactNode; subtitleEn: string; bi: boolean }) {
  return (
    <div className="doc-title">
      <h1>{title}</h1>
      {bi && <div className="en">{titleEn}</div>}
      <p>{subtitle}</p>
      {bi && <p className="en">{subtitleEn}</p>}
      <hr />
    </div>
  );
}

export type Cell = { ar: string; en: string; value: ReactNode; valueEn?: ReactNode };

/** The date block beside a grid of label/value cells. */
export function InfoCard({ day, cells, bi }: { day: { weekday: string; day: string; monthYear: string; hijri: string; en: string }; cells: Cell[]; bi: boolean }) {
  return (
    <div className="doc-card">
      <div className="doc-date">
        <span>{day.weekday}</span>
        <span className="d">{day.day}</span>
        <span>{day.monthYear}م</span>
        <small>{day.hijri}</small>
        {bi && <small className="en-c">{day.en}</small>}
      </div>
      <div className="doc-grid">
        {cells.map((c) => (
          <div key={c.ar}>
            <L ar={c.ar} en={c.en} bi={bi} className="k" />
            <L ar={c.value || "—"} en={c.valueEn ?? (bi ? c.value : undefined)} bi={bi} className="v" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A name with its role beneath; in bilingual mode the English pair sits on the end side of the same cell. */
export function PersonCell({ name, nameEn, role, roleEn, bi }: { name: string; nameEn?: string | null; role: string; roleEn: string; bi: boolean }) {
  const block = (n: ReactNode, r: string, cls?: string) => (
    <span className={cls}>
      <b>{n}</b>
      {r && <small>{r}</small>}
    </span>
  );
  if (!bi) return block(name, role);
  return (
    <div className="pair top">
      {block(name, role)}
      {block(nameEn?.trim() ? nameEn : <span className="missing">—</span>, roleEn, "en")}
    </div>
  );
}

export type Signer = { role: string; roleEn: string; name: string; nameEn?: string | null; status?: string; statusEn?: string; date?: string; dateEn?: string };

/** One signature block for everyone: chair, secretary and members share the same card. */
export function Signatures({ signers, bi }: { signers: Signer[]; bi: boolean }) {
  return (
    <div className={signers.length <= 2 ? "doc-sigs two" : "doc-sigs"}>
      {signers.map((s, i) => (
        <div key={i} className="doc-sig">
          <L ar={s.role} en={s.roleEn} bi={bi} className="role" />
          <b>{s.name || "—"}</b>
          {bi && <b className="en-c">{s.nameEn || " "}</b>}
          <div className="box">{s.status && <L ar={s.status} en={s.statusEn} bi={bi} />}</div>
          <L ar={s.date ? `التاريخ: ${s.date}` : "التاريخ: ........"} en={s.dateEn ? `Date: ${s.dateEn}` : "Date: ........"} bi={bi} className="when" />
        </div>
      ))}
    </div>
  );
}

/** Screen toolbar (hidden when printing) and the running footer: reference and version, then page numbers. */
export function DocChrome({ footer, bi, note, fileName }: { footer: string; bi: boolean; note?: ReactNode; fileName: string }) {
  const box = (content: string) => `content: ${content}; font: 8pt var(--font-body); color: #5b6763;`;
  const pages = bi
    ? `@bottom-center { ${box('"صفحة " counter(page) " من " counter(pages)')} } @bottom-left { ${box('"Page " counter(page) " of " counter(pages)')} }`
    : `@bottom-left { ${box('"صفحة " counter(page) " من " counter(pages)')} }`;
  return (
    <>
      <style>{`@page { @bottom-right { ${box(JSON.stringify(footer))} } ${pages} }`}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-rule bg-paper p-3">
        <span className="text-sm font-medium">معاينة قبل الطباعة</span>
        <div className="text-sm text-danger">{note}</div>
        <PrintButton fileName={fileName} />
      </div>
    </>
  );
}

/** Latin reference that reads the same in Arabic and English: BD-2026-07 (board) or CM-2026-03 (committee). */
export const reference = (isBoard: boolean, number: number | null, startsAt: string) => `${isBoard ? "BD" : "CM"}-${startsAt.slice(0, 4)}-${String(number ?? 0).padStart(2, "0")}`;
