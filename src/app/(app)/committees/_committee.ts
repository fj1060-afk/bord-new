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
