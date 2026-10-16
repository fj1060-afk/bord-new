import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Committee = { id: string; name: string; mandate: string | null; kind: string; status: "active" | "archived" };

/** The committee a page is about, once per request (RLS applies). */
export const committeeOf = cache(async (id: string): Promise<Committee> => {
  const supabase = await createClient();
  const { data } = await supabase.from("committees").select("id, name, mandate, kind, status").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as Committee;
});

/** Active members with their board category (known only for board members), for the composition checks. */
export async function compositionMembers(committeeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("committee_members")
    .select("position, person:people(full_name, board_members(category, status))")
    .eq("committee_id", committeeId)
    .eq("status", "active");
  return ((data ?? []) as unknown as { position: string; person: { full_name: string; board_members: { category: string; status: string }[] } }[]).map((m) => ({
    name: m.person.full_name,
    position: m.position,
    boardCategory: m.person.board_members.find((b) => b.status === "active")?.category ?? null,
  }));
}
