import type { ReactNode } from "react";
import clsx from "clsx";
import { CalendarDays, CircleCheck, CircleX, Hourglass, type LucideIcon } from "lucide-react";
import { dateParts } from "@/lib/format";
import { riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";
import { Countdown } from "./countdown";

function Stat({ icon: Icon, label, value, note, tone, highlight, children }: { icon: LucideIcon; label: string; value: number; note?: string; tone?: "danger"; highlight?: boolean; children?: ReactNode }) {
  return (
    <section className={clsx("flex flex-col gap-3 rounded-xl border p-4", highlight ? "border-primary/40 bg-primary-soft/40" : "border-rule bg-surface")}>
      <div className="flex items-center gap-3">
        <span className={clsx("grid size-9 shrink-0 place-items-center rounded-lg", tone === "danger" ? "bg-danger/10 text-danger" : "bg-primary-soft text-primary")}>
          <Icon size={18} aria-hidden="true" />
        </span>
        <h2 className="min-w-0 flex-1 text-sm font-medium">{label}</h2>
        {highlight && <span className="font-mono text-3xl font-bold">{value}</span>}
      </div>
      {!highlight && <span className="font-mono text-3xl font-bold">{value}</span>}
      {children}
      {note && <p className="mt-auto text-xs text-ink-muted">{note}</p>}
    </section>
  );
}

/** The year at a glance: all meetings, upcoming (with a countdown to the next), held and cancelled. */
export async function MeetingStats() {
  const supabase = await createClient();
  const now = new Date();
  const year = Number(riyadhToday(now).slice(0, 4));
  const start = `${year}-01-01T00:00:00+03:00`;
  const end = `${year + 1}-01-01T00:00:00+03:00`;
  const count = () => supabase.from("meetings").select("id", { count: "exact", head: true }).gte("starts_at", start).lt("starts_at", end);
  const [{ count: total }, { count: held }, { count: cancelled }, { count: upcoming }, { data: next }] = await Promise.all([
    count(),
    count().neq("status", "cancelled").eq("live_status", "ended"),
    count().eq("status", "cancelled"),
    supabase.from("meetings").select("id", { count: "exact", head: true }).neq("status", "cancelled").gte("starts_at", now.toISOString()),
    supabase.from("meetings").select("starts_at").neq("status", "cancelled").gte("starts_at", now.toISOString()).order("starts_at").limit(1).maybeSingle(),
  ]);
  const when = next ? dateParts(new Date(next.starts_at)) : null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={CalendarDays} label="إجمالي الاجتماعات" value={total ?? 0} note={`عام ${year}`} />
      <Stat icon={Hourglass} label="الاجتماعات القادمة" value={upcoming ?? 0} highlight>
        {next && when ? (
          <>
            <p className="text-xs text-ink-muted">المتبقي على الاجتماع القادم</p>
            <Countdown target={next.starts_at} initialNow={now.getTime()} />
            <p className="text-center text-xs text-ink-muted">
              {when.weekday} {when.long} · {when.time}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-muted">لا اجتماعات قادمة</p>
        )}
      </Stat>
      <Stat icon={CircleCheck} label="الاجتماعات المكتملة" value={held ?? 0} note={held ? `منعقدة في ${year}` : "لا توجد اجتماعات منعقدة بعد"} />
      <Stat icon={CircleX} label="الاجتماعات الملغاة" value={cancelled ?? 0} note={cancelled ? `ملغاة في ${year}` : "لا توجد اجتماعات ملغاة"} tone="danger" />
    </div>
  );
}
