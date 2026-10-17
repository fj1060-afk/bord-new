import { Hand } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/auth";
import { formatGregorianDate, formatHijriDate } from "@/lib/format";
import { riyadhToday } from "@/lib/minutes";
import { loadPortal } from "@/lib/portal-server";
import { HomeBoard } from "./home-board";

/** A department user's home: a short greeting, three summary cards and the list of what needs them. */
export async function PortalHome({ supabase, viewer, greeting }: { supabase: SupabaseClient; viewer: Viewer; greeting: string }) {
  const [{ rows, departments }, { data: profile }] = await Promise.all([loadPortal(supabase, viewer), supabase.from("profiles").select("job_title").eq("id", viewer.id).maybeSingle()]);
  const now = new Date();
  const role = profile?.job_title || (departments.length ? `مندوب ${departments.map((d) => d.name).join(" و")}` : "مندوب إدارة");

  return (
    <>
      <header className="mb-6 flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border border-rule bg-surface text-brass">
          <Hand size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {greeting}، {viewer.fullName || "مرحباً"}
          </h1>
          <p className="text-sm text-ink-muted">
            {role} · {formatGregorianDate(now)} · {formatHijriDate(now)}
          </p>
        </div>
      </header>
      <HomeBoard rows={rows} today={riyadhToday()} />
    </>
  );
}
