import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { RichText } from "@/components/ui/rich-text";
import { plainText } from "@/lib/rich-text";
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

/** Arabic with its English translation beneath it, smaller (one pattern for labels, headers and values). */
export function S({ ar, en, bi, as: Tag = "span", className }: { ar: ReactNode; en?: ReactNode; bi: boolean; as?: "span" | "div" | "b"; className?: string }) {
  return (
    <Tag className={`stack-l ${className ?? ""}`}>
      <span>{ar}</span>
      {bi && en ? <span className="sub en">{en}</span> : null}
    </Tag>
  );
}

/** A table header cell: Arabic, its English beneath in the same cell. */
export function Th({ ar, en, bi, width }: { ar: string; en: string; bi: boolean; width?: string }) {
  return (
    <th style={width ? { width } : undefined}>
      <S ar={ar} en={en} bi={bi} />
    </th>
  );
}

const MISSING = <span className="missing">English translation not provided.</span>;

/** Long text: Arabic, and in bilingual mode its English translation beside it. */
export function BiText({ ar, en, bi }: { ar: ReactNode; en?: string | null; bi: boolean }) {
  const arabic = typeof ar === "string" ? <RichText value={ar} /> : <p className="pre">{ar}</p>;
  if (!bi) return arabic;
  return (
    <div className="doc-bi">
      {arabic}
      <div className="en">{plainText(en) ? <RichText value={en} dir="ltr" lang="en" /> : <p>{MISSING}</p>}</div>
    </div>
  );
}

/** Letterhead: seal and Arabic name on the right; English name, issuer and the classification on the left. No dates or references: those live in the card and footer. */
export function DocHead({ company, companyEn, issuer, issuerEn, badges, bi }: { company: string; companyEn: string; issuer: string; issuerEn: string; badges: Badge[]; bi: boolean }) {
  const marks = (
    <div className="doc-marks">
      {badges.map((b, i) => (
        <span key={b.ar} className={`mark ${b.tone}`}>
          {i > 0 && <i className="dot" aria-hidden="true" />}
          {bi ? (
            <>
              <span>{b.ar}</span>
              <i className="bar" aria-hidden="true" />
              <span className="en">{b.en}</span>
            </>
          ) : (
            b.ar
          )}
        </span>
      ))}
    </div>
  );
  return (
    <header className="doc-head">
      <div className="doc-seal">م</div>
      <div className="doc-org">
        <b className="org">{company}</b>
        <span>{issuer}</span>
        {!bi && marks}
      </div>
      {bi && (
        <div className="doc-org en">
          <b className="org">{companyEn || company}</b>
          <span>{issuerEn}</span>
          {marks}
        </div>
      )}
    </header>
  );
}

/** Title band: the title in green (Arabic | English), then the body and the meeting number on a light row. */
export function DocTitle({ title, titleEn, body, bodyEn, number, bi }: { title: string; titleEn: string; body: string; bodyEn: string; number: ReactNode; bi: boolean }) {
  return (
    <div className="doc-title">
      <div className="band">
        <h1>{title}</h1>
        {bi && <div className="en">{titleEn}</div>}
      </div>
      <div className="facts">
        <div>{body}</div>
        <div className="no">
          <span className="k">
            رقم الاجتماع
            {bi && (
              <>
                {" / "}
                <bdi dir="ltr">Meeting No.</bdi>
              </>
            )}
          </span>
          <b className="num" dir="ltr">{number}</b>
        </div>
        {bi && <div className="en">{bodyEn}</div>}
      </div>
    </div>
  );
}

export type Cell = { ar: string; en: string; icon: LucideIcon; value: ReactNode; valueEn?: ReactNode; /** One value for both languages (e.g. a time range), centred. */ single?: boolean };
export type Day = { weekday: string; weekdayEn: string; day: string; month: string; monthEn: string; year: string; hijri: string };

/** The date block beside a grid of cells: icon and label (Arabic | English) above, the value in each language below. */
export function InfoCard({ day, cells, bi, caption }: { day: Day; cells: Cell[]; bi: boolean; /** What the date is, e.g. the meeting date or the day it was held. */ caption?: [string, string] }) {
  const both = (ar: ReactNode, en: ReactNode) =>
    bi ? (
      <>
        <span>{ar}</span>
        <i className="bar" aria-hidden="true" />
        <span className="en">{en}</span>
      </>
    ) : (
      <span>{ar}</span>
    );
  return (
    <div className="doc-card">
      <div className="doc-date">
        {caption && (
          <span className="cap">
            <span>{caption[0]}</span>
            {bi && <span>{caption[1]}</span>}
          </span>
        )}
        <span className="dl">{both(day.weekday, day.weekdayEn)}</span>
        <span className="d">{day.day}</span>
        <span className="dl my">{bi ? both(day.month, `${day.monthEn} ${day.year}`) : `${day.month} ${day.year}`}</span>
        <small>{day.hijri}</small>
      </div>
      <div className={cells.length === 4 ? "doc-grid c2" : "doc-grid"}>
        {cells.map(({ ar, en, icon: Icon, value, valueEn, single }) => (
          <div key={ar}>
            <div className="k">
              <Icon size={15} strokeWidth={1.6} aria-hidden="true" className="ic" />
              <span>{ar}</span>
              {bi && (
                <>
                  <i className="bar" aria-hidden="true" />
                  <span className="en">{en}</span>
                </>
              )}
            </div>
            {single || !bi ? (
              <div className={single ? "v one" : "v"}>{(bi && single ? valueEn : value) || "—"}</div>
            ) : (
              <div className="v pair">
                <span>{value || "—"}</span>
                <span className="en">{valueEn ?? value ?? "—"}</span>
              </div>
            )}
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
    <span>
      <b>{name}</b>
      {role && <small>{role}</small>}
      <span className="sub en">
        {nameEn?.trim() || "—"}
        {roleEn && ` · ${roleEn}`}
      </span>
    </span>
  );
}

export type Signer = { role: string; roleEn: string; name: string; nameEn?: string | null; status?: string; statusEn?: string; date?: string; dateEn?: string };

/** Signatures on a plain line: role, name, the line itself, then one date line (bilingual label once). */
export function Signatures({ signers, bi }: { signers: Signer[]; bi: boolean }) {
  return (
    <div className={signers.length <= 2 ? "doc-sigs two" : "doc-sigs"}>
      {signers.map((s, i) => (
        <div key={i} className="doc-sig">
          <S ar={s.role} en={s.roleEn} bi={bi} className="role" />
          <b>{s.name || "—"}</b>
          {bi && s.nameEn && <span className="sub en-c">{s.nameEn}</span>}
          <div className="line">{s.status && <S ar={s.status} en={s.statusEn} bi={bi} className="signed" />}</div>
          <span className="when">
            {bi ? "التاريخ / Date" : "التاريخ"}: {s.date ?? <span className="blank" />}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Screen toolbar (hidden when printing) and the running footer: reference and version, then page numbers. */
export function DocChrome({ footer, header, bi, note, fileName }: { footer: string; header?: string; bi: boolean; note?: ReactNode; fileName: string }) {
  const box = (content: string) => `content: ${content}; font: 8pt var(--font-body); color: #5b6763;`;
  const pages = bi
    ? `@bottom-center { ${box('"صفحة " counter(page) " من " counter(pages)')} } @bottom-left { ${box('"Page " counter(page) " of " counter(pages)')} }`
    : `@bottom-left { ${box('"صفحة " counter(page) " من " counter(pages)')} }`;
  return (
    <>
      <style>{`@page { @bottom-right { ${box(JSON.stringify(footer))} } ${pages} ${header ? `@top-right { ${box(JSON.stringify(header))} }` : ""} } @page :first { @top-right { content: none; } }`}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-rule bg-paper p-3">
        <span className="text-sm font-medium">معاينة قبل الطباعة</span>
        <div className="text-sm text-danger">{note}</div>
        <PrintButton fileName={fileName} />
      </div>
    </>
  );
}

/** Latin reference that reads the same in Arabic and English: BD-2026-07 (board) or CM-2026-03 (committee). */
export const reference = (isBoard: boolean, number: number | null, startsAt: string) => `${isBoard ? "BD" : "CM"}-${startsAt.slice(0, 4)}-${number ? String(number).padStart(2, "0") : "DRAFT"}`;
