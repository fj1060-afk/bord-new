// Messages prepared for the secretary's own mail client (Outlook on the
// computer): a mailto link for emails and an .ics invitation for the
// calendar. Nothing is sent by the system; the secretary presses Send.

/** Above this, a mailto link is unreliable in Outlook; the body goes to the clipboard instead. */
export const MAILTO_LIMIT = 1800;

export type Mail = { to: string[]; subject: string; body: string; cc?: string[] };

const enc = encodeURIComponent;

/** A mailto link; the body is left out (and must be pasted) when the link would be too long. */
export function mailto({ to, subject, body, cc }: Mail): { href: string; fits: boolean } {
  const head = `mailto:${to.map(encodeURIComponent).join(",")}?subject=${enc(subject)}${cc?.length ? `&cc=${cc.map(encodeURIComponent).join(",")}` : ""}`;
  const full = `${head}&body=${enc(body.replace(/\n/g, "\r\n"))}`;
  return full.length <= MAILTO_LIMIT ? { href: full, fits: true } : { href: `${head}&body=${enc("(الصق نص الرسالة هنا)")}`, fits: false };
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Folds a content line at 75 octets as RFC 5545 requires (UTF-8 safe). */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export type Invite = { uid: string; title: string; start: Date; minutes: number; location: string; description: string; organizer?: { name: string; email: string }; attendees: { name: string; email: string }[] };

/** A meeting request (.ics) that opens in Outlook with the attendees, time, place and agenda filled in. */
export function icsInvite(i: Invite): string {
  const end = new Date(i.start.getTime() + i.minutes * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bord//Board Meetings//AR",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${i.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(i.start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(i.title)}`,
    `LOCATION:${icsText(i.location)}`,
    `DESCRIPTION:${icsText(i.description)}`,
    ...(i.organizer ? [`ORGANIZER;CN=${icsText(i.organizer.name)}:mailto:${i.organizer.email}`] : []),
    ...i.attendees.map((a) => `ATTENDEE;CN=${icsText(a.name)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${a.email}`),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** The same invitation as an Outlook on the web compose link (attachments are added there by hand). */
export function outlookWebInvite(i: Omit<Invite, "uid" | "organizer">): string {
  const end = new Date(i.start.getTime() + i.minutes * 60000);
  const q = new URLSearchParams({ subject: i.title, startdt: i.start.toISOString(), enddt: end.toISOString(), location: i.location, body: i.description, to: i.attendees.map((a) => a.email).join(",") });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${q.toString().replace(/\+/g, "%20")}`;
}
