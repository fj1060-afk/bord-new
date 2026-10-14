import type { ReactNode } from "react";
import { dateParts } from "@/lib/format";
import { PrintButton } from "./print-button";

/** Document letterhead: company and issuer on the start side, badges, reference and date on the end side. */
export function DocHead({ company, issuer, reference, date, badges }: { company: string; issuer: string; reference: string; date: Date; badges: { label: string; tone: "c" | "s" | "ok" }[] }) {
  return (
    <div className="doc-head">
      <div className="org">
        <b>{company}</b>
        <span>{issuer}</span>
      </div>
      <div className="doc-meta">
        <div className="doc-badges">
          {badges.map((b) => (
            <span key={b.label} className={`doc-badge ${b.tone}`}>
              {b.label}
            </span>
          ))}
        </div>
        المرجع:{" "}
        <b className="num">
          <bdi dir="ltr">{reference}</bdi>
        </b>
        <br />
        {dateParts(date).long}م
      </div>
    </div>
  );
}

export function DocTitle({ title, subtitle, titleEn, subtitleEn }: { title: string; subtitle: ReactNode; titleEn?: string; subtitleEn?: string }) {
  return (
    <div className="doc-title">
      <h1>{title}</h1>
      {titleEn && <div className="en">{titleEn}</div>}
      <p className={subtitleEn ? "sub" : undefined}>
        <span>{subtitle}</span>
        {subtitleEn && (
          <>
            <span>·</span>
            <span className="en">{subtitleEn}</span>
          </>
        )}
      </p>
      <hr />
    </div>
  );
}

/** The date block beside a grid of label/value cells (multiples of three fill the grid). */
export function InfoCard({ date, cells, bi = false, dateEn }: { date: Date; cells: [string, ReactNode, string?, ReactNode?][]; bi?: boolean; dateEn?: string }) {
  const d = dateParts(date);
  return (
    <div className="doc-card">
      <div className="doc-date">
        <span>{d.weekday}</span>
        <span className="d">{d.day}</span>
        <span>{d.monthYear}م</span>
        <small>
          {dateEn && (
            <>
              {dateEn}
              <br />
            </>
          )}
          {d.hijri}
        </small>
      </div>
      <div className="doc-grid">
        {cells.map(([label, value, labelEn, valueEn]) => (
          <div key={label}>
            <L ar={label} en={labelEn} bi={bi} />
            {bi && valueEn ? (
              <b className="stack">
                <span>{value || "—"}</span>
                <span className="en">{valueEn}</span>
              </b>
            ) : (
              <b>{value || "—"}</b>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Screen toolbar (hidden when printing) and the running footer text for every printed page. */
export function DocChrome({ footer, note, bi = false }: { footer: string; note?: ReactNode; bi?: boolean }) {
  const box = (content: string) => `content: ${content}; font: 8pt var(--font-body); color: #5b6763;`;
  const pages = bi
    ? `@bottom-center { ${box('"صفحة " counter(page) " من " counter(pages)')} } @bottom-left { ${box('"Page " counter(page) " of " counter(pages)')} }`
    : "";
  return (
    <>
      <style>{`@page { @bottom-right { ${box(JSON.stringify(footer))} } ${pages} }`}</style>
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-ink-muted">{note}</span>
        <PrintButton />
      </div>
    </>
  );
}

/** Latin reference that reads the same in Arabic and English: BD-2026-07 (board) or CM-2026-03 (committee). */
export const reference = (isBoard: boolean, number: number | null, startsAt: string) => `${isBoard ? "BD" : "CM"}-${startsAt.slice(0, 4)}-${String(number ?? 0).padStart(2, "0")}`;

/** Arabic, with its English counterpart on the end side when the document is bilingual. */
export function L({ ar, en, bi, as: Tag = "span", className }: { ar: ReactNode; en?: ReactNode; bi: boolean; as?: "span" | "div" | "h2" | "b"; className?: string }) {
  if (!bi || !en) return <Tag className={className}>{ar}</Tag>;
  return (
    <Tag className={`pair ${className ?? ""}`}>
      <span>{ar}</span>
      <span className="en">{en}</span>
    </Tag>
  );
}

/** Long text: two columns (Arabic, English) when bilingual and an English text exists. */
export function BiText({ ar, en, bi }: { ar: ReactNode; en?: string | null; bi: boolean }) {
  if (!bi || !en) return <p style={{ whiteSpace: "pre-line" }}>{ar}</p>;
  return (
    <div className="doc-bi">
      <p style={{ whiteSpace: "pre-line" }}>{ar}</p>
      <p className="en" style={{ whiteSpace: "pre-line" }}>
        {en}
      </p>
    </div>
  );
}

/** Bilingual letterhead: Arabic block, seal, English block; then a reference strip. */
export function DocHeadBi({ company, companyEn, issuer, issuerEn, reference, date, dateEn, badges }: { company: string; companyEn: string; issuer: string; issuerEn: string; reference: string; date: string; dateEn: string; badges: { label: string; tone: "c" | "s" | "ok" }[] }) {
  return (
    <>
      <div className="doc-head3">
        <div className="ar">
          <b>{company}</b>
          <span>{issuer}</span>
        </div>
        <div className="doc-seal">م</div>
        <div className="en">
          <b>{companyEn}</b>
          <span>{issuerEn}</span>
        </div>
      </div>
      <div className="doc-strip">
        <span>
          المرجع:{" "}
          <b className="num">
            <bdi dir="ltr">{reference}</bdi>
          </b>{" "}
          · {date}
        </span>
        <span>
          {badges.map((b) => (
            <span key={b.label} className={`doc-badge ${b.tone}`} style={{ marginInlineStart: 4 }}>
              {b.label}
            </span>
          ))}
        </span>
        <span className="en">
          Ref: <b className="num">{reference}</b> · {dateEn}
        </span>
      </div>
    </>
  );
}
