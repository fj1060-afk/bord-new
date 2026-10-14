import type { ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

/** One headline number with its label; optional note and link. */
export function StatTile({ label, value, note, href, tone = "default" }: { label: string; value: ReactNode; note?: ReactNode; href?: string; tone?: "default" | "alert" }) {
  const body = (
    <>
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="font-mono text-3xl text-ink">{value}</span>
      {note && <span className={clsx("text-xs", tone === "alert" ? "text-danger" : "text-ink-muted")}>{note}</span>}
    </>
  );
  const className = clsx(
    "flex flex-col gap-1 rounded-lg border bg-surface p-5",
    tone === "alert" ? "border-danger/40" : "border-rule",
    href && "transition-colors hover:border-primary",
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-rule bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

/** A single-hue proportion bar; the number beside it carries the value, not the color. */
export function Meter({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex items-center gap-3" title={label}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-soft" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 text-end font-mono text-sm">{percent}%</span>
    </div>
  );
}
