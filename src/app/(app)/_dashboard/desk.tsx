"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, BarChart3, Building2, CalendarDays, ChevronLeft, Clock, FileText, Gavel, PenLine, Send, ShieldCheck, User, Users, X } from "lucide-react";
import { dueText, SEVERITY, type Attention, type AttentionIcon, type Sev } from "@/lib/attention";
import type { Desk } from "@/lib/desk-server";

const ICONS: Record<AttentionIcon, typeof Send> = { send: Send, users: Users, file: FileText, shield: ShieldCheck, person: User, gavel: Gavel, calendar: CalendarDays, pen: PenLine, clock: Clock, chart: BarChart3, alert: AlertTriangle };
const SEV_TONE: Record<Sev, string> = { block: "bg-danger/10 text-danger", warn: "bg-brass-soft text-brass", tip: "bg-paper text-ink-muted" };
const STRIPE: Record<Sev, string> = { block: "bg-danger", warn: "bg-brass", tip: "bg-rule" };
const STAGES = ["التحضير", "الدعوة", "الانعقاد", "المحضر"];

type Panel = { title: string; sub?: string; sev?: Sev; lines?: [string, ReactNode][]; list?: { text: string; side?: string; tone?: "block" | "warn" | "ok"; href?: string }[]; links: { label: string; href: string }[] };

function Drawer({ panel, onClose }: { panel: Panel | null; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!panel) return;
    close.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panel, onClose]);
  return (
    <div className={clsx("fixed inset-0 z-40 transition-[visibility] duration-200", panel ? "visible" : "invisible")} aria-hidden={!panel}>
      <button type="button" aria-label="إغلاق" onClick={onClose} className={clsx("absolute inset-0 bg-black/35 transition-opacity duration-200", panel ? "opacity-100" : "opacity-0")} />
      <div role="dialog" aria-modal="true" aria-labelledby="desk-panel-title" className={clsx("absolute inset-y-0 end-0 flex w-full max-w-md flex-col border-s border-rule bg-surface shadow-xl transition-transform duration-200 ease-out", panel ? "translate-x-0" : "-translate-x-full")}>
        {panel && (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
              <div className="min-w-0">
                {panel.sev && <span className={clsx("rounded-full px-2 py-0.5 text-xs", SEV_TONE[panel.sev])}>{SEVERITY[panel.sev]}</span>}
                <h3 id="desk-panel-title" className="mt-1 font-display text-lg font-bold text-balance">{panel.title}</h3>
                {panel.sub && <p className="text-sm text-ink-muted">{panel.sub}</p>}
              </div>
              <button ref={close} type="button" onClick={onClose} aria-label="إغلاق" className="rounded-md border border-rule p-1.5 hover:bg-paper">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 text-sm">
              {panel.lines && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
                  {panel.lines.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-ink-muted">{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {panel.list && panel.list.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {panel.list.map((l, i) => {
                    const body = (
                      <>
                        <span className="min-w-0">{l.text}</span>
                        {l.side && <span className="shrink-0 text-xs text-ink-muted">{l.side}</span>}
                      </>
                    );
                    const cls = clsx("flex justify-between gap-3 rounded-md border-s-[3px] bg-paper px-3 py-2.5", l.tone === "block" ? "border-danger" : l.tone === "warn" ? "border-brass" : l.tone === "ok" ? "border-primary" : "border-rule");
                    return <li key={i}>{l.href ? <Link href={l.href} className={clsx(cls, "hover:bg-primary-soft")}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
                  })}
                </ul>
              )}
            </div>
            <footer className="flex flex-wrap gap-2 border-t border-rule px-5 py-3">
              {panel.links.map((l, i) => (
                <Link key={l.href + l.label} href={l.href} className={clsx("rounded-md px-4 py-2 text-sm", i === 0 ? "bg-primary text-on-primary hover:opacity-90" : "border border-rule hover:bg-paper")}>
                  {l.label}
                </Link>
              ))}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function Donut({ slices, percent, onPick }: { slices: NonNullable<Desk["compliance"]>["slices"]; percent: number | null; onPick: (s: string) => void }) {
  const color = { ok: "var(--primary)", warning: "var(--brass)", violation: "var(--danger)" } as const;
  const total = slices.reduce((s, x) => s + x.rules.length, 0) || 1;
  const r = 44, c = 2 * Math.PI * r;
  const lens = slices.map((s) => (s.rules.length / total) * c);
  const offs = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex items-center gap-4 p-4">
      <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`نسبة الامتثال ${percent ?? "—"}%`} className="shrink-0">
        <circle cx="56" cy="56" r={r} fill="none" stroke="var(--rule)" strokeWidth="14" />
        {slices.map((s, i) => {
          const len = lens[i];
          return <circle key={s.status} cx="56" cy="56" r={r} fill="none" stroke={color[s.status]} strokeWidth="14" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offs[i]} transform="rotate(-90 56 56)" className="cursor-pointer hover:[stroke-width:17]" onClick={() => onPick(s.status)} />;
        })}
        <text x="56" y="62" textAnchor="middle" className="fill-ink font-mono text-xl">{percent === null ? "—" : `${percent}%`}</text>
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        {slices.map((s) => (
          <li key={s.status}>
            <button type="button" onClick={() => onPick(s.status)} className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-paper">
              <span className="flex items-center gap-2">
                <i className="size-2.5 rounded-full" style={{ background: color[s.status] }} />
                {s.label}
              </span>
              <span className="flex items-center gap-1 font-mono">
                {s.rules.length} <ChevronLeft size={12} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttendanceChart({ points, onPick }: { points: NonNullable<Desk["attendance"]>; onPick: (i: number) => void }) {
  // Time runs right to left, as the page reads; the scale sits on the right.
  const n = points.length;
  const x = (i: number) => (n === 1 ? 150 : 270 - (i * 250) / (n - 1));
  const y = (v: number) => 104 - (Math.max(v, 50) - 50) * 1.6;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)} ${y(p.rate)}`).join(" ");
  return (
    <svg viewBox="0 0 320 132" className="block h-auto w-full [direction:ltr]" role="img" aria-label="نسبة حضور اجتماعات المجلس">
      {[50, 75, 100].map((v) => (
        <g key={v}>
          <line x1="14" x2="284" y1={y(v)} y2={y(v)} stroke="var(--rule)" />
          <text x="290" y={y(v) + 4} className="fill-ink-muted text-[11px]">{v}%</text>
        </g>
      ))}
      {n > 1 && <path d={`${line} L${x(n - 1)} ${y(50)} L${x(0)} ${y(50)} Z`} fill="var(--primary-soft)" />}
      {n > 1 && <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2" />}
      {points.map((p, i) => (
        <g key={p.id} role="button" tabIndex={0} aria-label={`${p.date}: ${p.rate}%`} className="cursor-pointer focus:outline-none [&:focus-visible>circle:last-child]:stroke-brass" onClick={() => onPick(i)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onPick(i)}>
          <circle cx={x(i)} cy={y(p.rate)} r="14" fill="transparent" />
          <circle cx={x(i)} cy={y(p.rate)} r={i === n - 1 ? 5 : 4} fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" />
          <text x={x(i)} y="126" textAnchor="middle" className="fill-ink-muted text-[11px]">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

const Box = ({ title, sub, action, children }: { title: string; sub?: string; action?: ReactNode; children: ReactNode }) => (
  <section className="min-w-0 rounded-lg border border-rule bg-surface">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {sub && <p className="text-xs text-ink-muted">{sub}</p>}
      </div>
      {action}
    </header>
    {children}
  </section>
);

/** The viewer's desk: headline tiles, everything awaiting attention, the charts behind them, and the meeting pipeline. Every element opens its detail. */
export function DeskView({ desk }: { desk: Desk }) {
  const [filter, setFilter] = useState("all");
  const [panel, setPanel] = useState<Panel | null>(null);
  const queueRef = useRef<HTMLElement>(null);
  const { items, pipeline, compliance, bars, attendance } = desk;

  const openItem = (a: Attention) =>
    setPanel({ title: a.what, sub: a.where, sev: a.sev, lines: [["المكان", a.where], ["المسؤول", a.who], ...(a.days !== null ? ([["الموعد", dueText(a.days)]] as [string, string][]) : []), ...(a.ref ? ([["المرجع", a.ref]] as [string, string][]) : [])], links: [{ label: a.action, href: a.href }] });
  const openCompliance = (status: string) => {
    const s = compliance?.slices.find((x) => x.status === status);
    if (s) setPanel({ title: `قواعد الامتثال: ${s.label}`, sev: status === "violation" ? "block" : status === "warning" ? "warn" : undefined, list: s.rules.map((r) => ({ text: r.title, side: r.ref, tone: status === "violation" ? "block" : status === "warning" ? "warn" : "ok", href: r.href })), links: [{ label: "مكتب الحوكمة", href: "/governance-office" }] });
  };
  const openBar = (i: number) => {
    const b = bars?.[i];
    if (!b) return;
    const all = b.done + b.open + b.late;
    setPanel({ title: `تنفيذ قرارات ${b.name}`, sub: all ? `${Math.round((b.done / all) * 100)}% منفّذ من ${all} مهمة` : "لا مهام", sev: b.late ? "block" : undefined, lines: [["منفّذ", b.done], ["قيد التنفيذ", b.open], ["متأخر", b.late]], list: b.lateTasks.map((t) => ({ text: t.title, side: t.who, tone: "block", href: t.href })), links: [{ label: "قرارات الجهة", href: b.href }] });
  };
  const openAttendance = (i: number) => {
    const a = attendance?.[i];
    if (a) setPanel({ title: `حضور ${a.date}`, sub: `نسبة الحضور ${a.rate}%`, list: a.absent.length ? a.absent.map((t) => ({ text: t, tone: "warn" })) : [{ text: "حضر جميع الأعضاء", tone: "ok" }], links: [{ label: "كشف الحضور", href: `/meetings/${a.id}?tab=live` }, { label: "المحضر", href: `/meetings/${a.id}?tab=minutes` }] });
  };
  const openMeeting = (id: string) => {
    const r = pipeline.find((x) => x.id === id);
    if (r) setPanel({ title: r.title, sub: r.where, sev: r.stuck ? "block" : undefined, lines: [["المرحلة الحالية", STAGES[r.stage - 1]], ["الموعد", r.days >= 0 ? `بعد ${r.days} يوماً` : "انعقد"]], list: r.checks.map((c) => ({ text: c.label, side: c.ok ? "مستوفى" : c.detail, tone: c.ok ? "ok" : c.level === "block" ? "block" : "warn" })), links: [{ label: "فتح الاجتماع", href: `/meetings/${r.id}` }] });
  };
  const openTile = (t: Desk["tiles"][number]) => {
    if (t.open.kind === "filter") {
      setFilter(t.open.filter);
      queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (t.open.kind === "panel") {
      const [kind, arg] = t.open.panel.split(":");
      if (kind === "compliance") openCompliance(arg);
      if (kind === "bar") openBar(Number(arg));
      if (kind === "att") openAttendance(Number(arg));
      if (kind === "meeting") openMeeting(arg);
    } else window.location.assign(t.open.href);
  };

  const bodies = [...new Map(items.filter((i) => i.body !== "company").map((i) => [i.body, i.bodyName])).entries()];
  const chips: [string, string, number][] = [
    ["all", "الكل", items.length],
    ...(["block", "warn", "tip"] as Sev[]).map((s): [string, string, number] => [s, SEVERITY[s], items.filter((i) => i.sev === s).length]).filter(([, , n]) => n > 0),
    ...(items.some((i) => i.mine) ? [["mine", "لي", items.filter((i) => i.mine).length] as [string, string, number]] : []),
    ...(bodies.length > 1 ? bodies.map(([b, name]): [string, string, number] => [`body:${b}`, name, items.filter((i) => i.body === b).length]) : []),
  ];
  const shown = items.filter((i) => filter === "all" || i.sev === filter || (filter === "mine" && i.mine) || filter === `body:${i.body}`);

  return (
    <div className="flex flex-col gap-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="المؤشرات">
        {desk.tiles.map((t) => {
          const Icon = ICONS[t.icon];
          return (
            <button key={t.key} type="button" onClick={() => openTile(t)} className={clsx("flex flex-col gap-1.5 rounded-lg border bg-surface p-4 text-start transition-[border-color,box-shadow] hover:border-primary hover:shadow-sm", t.alert ? "border-danger/40" : "border-rule")}>
              <span className="flex items-center justify-between gap-2 text-sm text-ink-muted">
                {t.label}
                <span className={clsx("grid size-8 place-items-center rounded-md", t.alert ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary")}>
                  <Icon size={17} aria-hidden="true" />
                </span>
              </span>
              <span className="font-mono text-3xl">{t.value}</span>
              <span className={clsx("text-xs", t.alert ? "text-danger" : "text-ink-muted")}>{t.note}</span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                {t.open.kind === "filter" ? "عرضها في القائمة" : "التفاصيل"} <ChevronLeft size={12} aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section ref={queueRef} className="min-w-0 scroll-mt-20 rounded-lg border border-rule bg-surface" aria-labelledby="desk-queue">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3">
            <div>
              <h2 id="desk-queue" className="font-display text-lg font-bold">يحتاج انتباهك</h2>
              <p className="text-xs text-ink-muted">مرتبة من الأخطر؛ اضغط أي سطر لتفاصيله وإجرائه</p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="تصفية">
              {chips.map(([k, label, n]) => (
                <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={clsx("rounded-full border px-2.5 py-0.5 text-xs", filter === k ? "border-ink text-ink" : "border-rule text-ink-muted hover:text-ink")}>
                  {label} <b className="font-mono font-medium">{n}</b>
                </button>
              ))}
            </div>
          </header>
          <ul className="divide-y divide-rule">
            {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-ink-muted">{items.length ? "لا شيء في هذا التصنيف." : "لا شيء يحتاج انتباهك الآن."}</li>}
            {shown.map((a) => {
              const Icon = ICONS[a.icon];
              return (
                <li key={a.id}>
                  <button type="button" onClick={() => openItem(a)} className="grid w-full grid-cols-[4px_34px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-start hover:bg-paper sm:grid-cols-[4px_34px_minmax(0,1fr)_auto]">
                    <span className={clsx("self-stretch rounded", STRIPE[a.sev])} aria-hidden="true" />
                    <span className={clsx("grid size-[34px] place-items-center rounded-md", a.sev === "block" ? "bg-danger/10 text-danger" : a.sev === "warn" ? "bg-brass-soft text-brass" : "bg-paper text-ink-muted")}>
                      <Icon size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{a.what}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
                        <span className="inline-flex items-center gap-1"><Building2 size={12} aria-hidden="true" />{a.where}</span>
                        <span className="inline-flex items-center gap-1"><User size={12} aria-hidden="true" />{a.who}</span>
                        {a.ref && <span>{a.ref}</span>}
                      </span>
                    </span>
                    <span className="col-start-3 flex flex-col items-start gap-1.5 text-xs sm:col-start-auto sm:items-end">
                      <span className="sr-only">{SEVERITY[a.sev]}</span>
                      {a.days !== null && <span className={a.sev === "block" ? "text-danger" : a.sev === "warn" ? "text-brass" : "text-ink-muted"}>{dueText(a.days)}</span>}
                      <span className="inline-flex items-center gap-1 rounded-md border border-rule px-2 py-0.5 text-primary">
                        {a.action} <ChevronLeft size={12} aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          {compliance && (
            <Box title="الامتثال" sub="القواعد الإلزامية">
              <Donut slices={compliance.slices} percent={compliance.percent} onPick={openCompliance} />
            </Box>
          )}
          {bars && bars.length > 0 && (
            <Box title="تنفيذ القرارات" sub="حسب الجهة">
              <div className="flex flex-col gap-1 p-3">
                {bars.map((b, i) => {
                  const all = b.done + b.open + b.late || 1;
                  return (
                    <button key={b.name} type="button" onClick={() => openBar(i)} className="rounded-md px-2 py-1.5 text-start hover:bg-paper">
                      <span className="mb-1 flex justify-between text-sm">
                        <span>{b.name}</span>
                        <span className="font-mono">{Math.round((b.done / all) * 100)}%</span>
                      </span>
                      <span className="flex h-2 overflow-hidden rounded-full bg-primary-soft" aria-label={`${b.done} منفّذ، ${b.open} قيد التنفيذ، ${b.late} متأخر`}>
                        <i className="block bg-primary" style={{ width: `${(b.done / all) * 100}%` }} />
                        <i className="block bg-brass" style={{ width: `${(b.open / all) * 100}%` }} />
                        <i className="block bg-danger" style={{ width: `${(b.late / all) * 100}%` }} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="flex flex-wrap gap-3 px-4 pb-3 text-xs text-ink-muted">
                <span><i className="me-1 inline-block size-2 rounded-full bg-primary" />منفّذ</span>
                <span><i className="me-1 inline-block size-2 rounded-full bg-brass" />قيد التنفيذ</span>
                <span><i className="me-1 inline-block size-2 rounded-full bg-danger" />متأخر</span>
              </p>
            </Box>
          )}
          {attendance && attendance.length > 0 && (
            <Box title="حضور اجتماعات المجلس" sub="هذه السنة">
              <div className="px-3 pb-3 pt-2">
                <AttendanceChart points={attendance} onPick={openAttendance} />
              </div>
            </Box>
          )}
        </div>
      </div>

      {pipeline.length > 0 && (
        <Box title="الاجتماعات القادمة" sub="أين وصل كل اجتماع في مراحله الأربع">
          <ul className="divide-y divide-rule">
            {pipeline.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => openMeeting(r.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-start hover:bg-paper md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                  <span className="min-w-0">
                    <span className="block font-medium">{r.title}</span>
                    <span className="block text-xs text-ink-muted">{r.where}</span>
                  </span>
                  <span className="order-3 col-span-2 md:order-none md:col-span-1">
                    <span className="grid grid-cols-4 gap-1">
                      {STAGES.map((s, i) => (
                        <span key={s} className={clsx("h-1.5 rounded", i + 1 < r.stage ? "bg-primary" : i + 1 === r.stage ? (r.stuck ? "bg-danger" : "bg-brass") : "bg-rule")} />
                      ))}
                    </span>
                    <span className="mt-1 grid grid-cols-4 gap-1 text-[11px] text-ink-muted">
                      {STAGES.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </span>
                  </span>
                  <span className="text-end text-xs text-ink-muted">
                    <b className="block font-mono text-lg font-medium text-ink">{r.days >= 0 ? r.days : "—"}</b>
                    {r.days >= 0 ? "يوماً" : "انعقد"} · {r.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Box>
      )}

      <Drawer panel={panel} onClose={() => setPanel(null)} />
    </div>
  );
}
