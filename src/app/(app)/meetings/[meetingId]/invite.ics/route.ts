import { requirePage } from "@/lib/auth";
import { inviteText } from "@/lib/meeting-mail";
import { meetingMail } from "@/lib/meeting-mail-server";
import { icsInvite } from "@/lib/outlook";
import { LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

/** The members' meeting request as an .ics file, opened in Outlook on the secretary's computer. */
export async function GET(_req: Request, ctx: RouteContext<"/meetings/[meetingId]/invite.ics">) {
  const { meetingId } = await ctx.params;
  const viewer = await requirePage("/meetings", LEVELS.edit);
  const supabase = await createClient();
  const mail = await meetingMail(supabase, meetingId, viewer.fullName);
  if (!mail) return new Response("Not found", { status: 404 });
  const ics = icsInvite({
    uid: `${meetingId}@bord`,
    title: `${mail.meeting.title} – ${mail.meeting.body}`,
    start: new Date(mail.meeting.startsAt),
    minutes: mail.minutes,
    location: mail.meeting.place,
    description: inviteText(mail.meeting, mail.items.map((i) => i.title)),
    organizer: { name: viewer.fullName, email: viewer.email },
    attendees: mail.invitees.filter((i): i is { name: string; email: string } => !!i.email),
  });
  return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8; method=REQUEST", "content-disposition": `attachment; filename="meeting-invite.ics"` } });
}
