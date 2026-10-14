// Pure rules for holding a meeting: attendance, quorum, timing.

export const ATTENDANCE = {
  present: "حاضر",
  remote: "حاضر عن بُعد",
  proxy: "بالإنابة",
  excused: "معتذر",
  absent: "غائب",
} as const;
export type AttendanceStatus = keyof typeof ATTENDANCE;

export const ITEM_STATUS = { pending: "لم يُناقش", discussed: "نوقش", deferred: "مؤجل" } as const;
export const LIVE_STATUS = { not_started: "لم يبدأ", in_progress: "منعقد", paused: "استراحة", ended: "انتهى" } as const;

const ATTENDING: AttendanceStatus[] = ["present", "remote"];

export type QuorumInput = {
  members: string[];
  attendance: Record<string, AttendanceStatus | undefined>;
  proxies: { grantor: string; holder: string }[];
  required?: number | null;
};

/**
 * Members count toward quorum when attending in person or remotely, or when
 * represented by a proxy whose holder attends. Default quorum: at least half.
 */
export function quorum({ members, attendance, proxies, required }: QuorumInput) {
  const attends = (id: string) => ATTENDING.includes(attendance[id] as AttendanceStatus);
  const holderOf = new Map(proxies.map((p) => [p.grantor, p.holder]));
  const counted = members.filter((id) => {
    if (attends(id)) return true;
    const holder = holderOf.get(id);
    return attendance[id] === "proxy" && holder !== undefined && attends(holder);
  }).length;
  const needed = required ?? Math.max(1, Math.ceil(members.length / 2));
  return { members: members.length, counted, required: needed, met: members.length > 0 && counted >= needed };
}

/** Seconds the meeting has run, excluding breaks (an open break counts up to now). */
export function elapsedSeconds(
  startedAt: string | null,
  endedAt: string | null,
  breaks: { started_at: string; ended_at: string | null }[],
  now: number,
): number {
  if (!startedAt) return 0;
  const end = endedAt ? Date.parse(endedAt) : now;
  const paused = breaks.reduce((sum, b) => sum + Math.max(0, (b.ended_at ? Date.parse(b.ended_at) : end) - Date.parse(b.started_at)), 0);
  return Math.max(0, Math.floor((end - Date.parse(startedAt) - paused) / 1000));
}

/** 3725 → "1:02:05", 65 → "1:05". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The first pending item after the current one, else the first pending item at all. */
export function nextPendingItem<T extends { id: string; position: number; status: string }>(items: T[], currentId: string | null): T | null {
  const sorted = [...items].sort((a, b) => a.position - b.position);
  const from = currentId ? sorted.findIndex((i) => i.id === currentId) : -1;
  return sorted.slice(from + 1).find((i) => i.status === "pending") ?? sorted.find((i) => i.status === "pending" && i.id !== currentId) ?? null;
}
