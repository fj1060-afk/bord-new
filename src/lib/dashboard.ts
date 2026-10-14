// Pure aggregations behind the home dashboard.

export type AttendanceRow = { person_id: string; name: string; status: string | null };

/** Per member: meetings attended (in person, remotely or by proxy) out of meetings invited to. */
export function attendanceRates(rows: AttendanceRow[]) {
  const byPerson = new Map<string, { name: string; invited: number; attended: number }>();
  for (const row of rows) {
    const entry = byPerson.get(row.person_id) ?? { name: row.name, invited: 0, attended: 0 };
    entry.invited++;
    if (row.status === "present" || row.status === "remote" || row.status === "proxy") entry.attended++;
    byPerson.set(row.person_id, entry);
  }
  return [...byPerson.entries()]
    .map(([personId, e]) => ({ personId, ...e, rate: e.invited ? Math.round((e.attended / e.invited) * 100) : 0 }))
    .sort((a, b) => a.rate - b.rate || a.name.localeCompare(b.name, "ar"));
}

/** Share of non-cancelled tasks that are done, plus how many are overdue. */
export function implementation(tasks: { status: string; due_date: string | null }[], today: string) {
  const live = tasks.filter((t) => t.status !== "cancelled");
  const done = live.filter((t) => t.status === "done").length;
  const overdue = live.filter((t) => t.status !== "done" && t.due_date !== null && t.due_date < today).length;
  return { total: live.length, done, overdue, percent: live.length ? Math.round((done / live.length) * 100) : null };
}

/** "صباح الخير" before noon Riyadh time, "مساء الخير" after. */
export function greeting(now = new Date()): string {
  const hour = (now.getUTCHours() + 3) % 24;
  return hour >= 4 && hour < 12 ? "صباح الخير" : "مساء الخير";
}
