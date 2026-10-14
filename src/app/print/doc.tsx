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
        المرجع: <b className="num" dir="ltr">{reference}</b>
        <br />
        {dateParts(date).long}م
      </div>
    </div>
  );
}

export function DocTitle({ title, subtitle }: { title: string; subtitle: ReactNode }) {
  return (
    <div className="doc-title">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <hr />
    </div>
  );
}

/** The date block beside a grid of label/value cells (multiples of three fill the grid). */
export function InfoCard({ date, cells }: { date: Date; cells: [string, ReactNode][] }) {
  const d = dateParts(date);
  return (
    <div className="doc-card">
      <div className="doc-date">
        <span>{d.weekday}</span>
        <span className="d">{d.day}</span>
        <span>{d.monthYear}م</span>
        <small>{d.hijri}</small>
      </div>
      <div className="doc-grid">
        {cells.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <b>{value || "—"}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Screen toolbar (hidden when printing) and the running footer text for every printed page. */
export function DocChrome({ footer, note }: { footer: string; note?: ReactNode }) {
  return (
    <>
      <style>{`@page { @bottom-right { content: ${JSON.stringify(footer)}; font: 8pt var(--font-body); color: #5b6763; } }`}</style>
      <div className="no-print mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-ink-muted">{note}</span>
        <PrintButton />
      </div>
    </>
  );
}

export const reference = (isBoard: boolean, number: number | null, startsAt: string) => `${isBoard ? "م.إ" : "ل"}/${startsAt.slice(0, 4)}/${String(number ?? 0).padStart(2, "0")}`;
