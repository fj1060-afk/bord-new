import { requirePage } from "@/lib/auth";
import { dateParts } from "@/lib/format";
import { meetingMinutes, meetingState, readTableQuery, type TableQuery } from "@/lib/meeting-table";
import { meetingReference } from "@/lib/meetings";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { MeetingsTableView, type TableRow } from "./meetings-table-view";

type Scope = { board: string } | { committee: string };

type Raw = {
  id: string;
  title: string;
  number: number | null;
  code: string | null;
  starts_at: string;
  duration_minutes: number | null;
  mode: string;
  status: string;
  live_status: string | null;
  started_at: string | null;
  ended_at: string | null;
  pack_published_at: string | null;
  board: { name: string } | null;
  committee: { name: string; kind: string } | null;
  meeting_invitees: { count: number }[];
  minutes: { id: string } | { id: string }[] | null;
};

const ACTIVE = "(in_progress,paused,ended)";

/** Applies the table's filters to a meetings query. */
function filtered(supabase: Awaited<ReturnType<typeof createClient>>, query: TableQuery, scope?: Scope) {
  let q = supabase
    .from("meetings")
    .select(
      "id, title, number, code, starts_at, duration_minutes, mode, status, live_status, started_at, ended_at, pack_published_at, board:boards(name), committee:committees(name, kind), meeting_invitees(count), minutes(id)",
      { count: "exact" },
    );
  if (scope) q = "board" in scope ? q.eq("board_id", scope.board) : q.eq("committee_id", scope.committee);
  if (query.body) {
    const [kind, id] = query.body.split(":");
    q = q.eq(kind === "board" ? "board_id" : "committee_id", id);
  }
  if (query.q) q = q.ilike("title", `%${query.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (query.state === "cancelled") q = q.eq("status", "cancelled");
  if (query.state === "ended") q = q.neq("status", "cancelled").eq("live_status", "ended");
  if (query.state === "live") q = q.neq("status", "cancelled").in("live_status", ["in_progress", "paused"]);
  if (query.state === "draft" || query.state === "scheduled") q = q.eq("status", query.state).not("live_status", "in", ACTIVE);
  const now = new Date().toISOString();
  if (query.period === "upcoming") q = q.gte("starts_at", now).order("starts_at");
  else if (query.period === "past") q = q.lt("starts_at", now).order("starts_at", { ascending: false });
  else q = q.order("starts_at", { ascending: false });
  return q.range((query.page - 1) * query.size, query.page * query.size - 1);
}

/** The meetings table for /meetings, the board or one committee; filters live in the URL. */
export async function MeetingsTable({ base, params, scope }: { base: string; params: Record<string, string | string[] | undefined>; scope?: Scope }) {
  const viewer = await requirePage("/meetings");
  const query = readTableQuery(params);
  const supabase = await createClient();
  const [{ data, count }, { data: bodies }] = await Promise.all([filtered(supabase, query, scope), scope ? Promise.resolve({ data: [] }) : supabase.rpc("list_meeting_bodies")]);

  const rows: TableRow[] = ((data ?? []) as unknown as Raw[]).map((m) => {
    const when = dateParts(new Date(m.starts_at));
    const length = meetingMinutes(m);
    return {
      id: m.id,
      title: m.title,
      reference: meetingReference(m.code),
      body: m.board ? { name: m.board.name, tone: "board" } : { name: m.committee?.name ?? "—", tone: m.committee?.kind === "audit" ? "audit" : "committee" },
      date: when.long,
      time: when.time,
      minutes: length.minutes,
      actual: length.actual,
      mode: m.mode,
      people: m.meeting_invitees[0]?.count ?? 0,
      state: meetingState(m),
      hasMinutes: Array.isArray(m.minutes) ? m.minutes.length > 0 : Boolean(m.minutes),
      packReady: Boolean(m.pack_published_at),
    };
  });

  return (
    <MeetingsTableView
      base={base}
      query={query}
      rows={rows}
      total={count ?? 0}
      bodies={((bodies ?? []) as { id: string; name: string; kind: string }[]).map((b) => ({ value: `${b.kind}:${b.id}`, label: b.name }))}
      canDelete={can(viewer.permissions, "/admin/roles", LEVELS.manage)}
      showBody={!scope}
      newHref={scope && can(viewer.permissions, "/meetings", LEVELS.edit) ? `/meetings/new?body=${"board" in scope ? `board:${scope.board}` : `committee:${scope.committee}`}` : null}
    />
  );
}
