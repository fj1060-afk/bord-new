import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { findNavItem, navigation } from "@/config/navigation";
import { phases } from "@/config/phases";

// Placeholder for every section that is not built yet. Each phase replaces
// its sections with real routes, which take precedence over this catch-all.

function lookup(section: string[]) {
  const href = `/${section.join("/")}`;
  const item = findNavItem(href);
  if (!item) return undefined;
  const group = navigation.find((g) => g.items.includes(item))!;
  const phase = phases.find((p) => p.number === item.phase)!;
  return { item, group, phase };
}

export async function generateMetadata({
  params,
}: PageProps<"/[...section]">): Promise<Metadata> {
  const found = lookup((await params).section);
  return { title: found?.item.label };
}

export default async function SectionPlaceholder({ params }: PageProps<"/[...section]">) {
  const found = lookup((await params).section);
  if (!found) notFound();
  const { item, group, phase } = found;
  await requirePage(item.href);

  return (
    <>
      <PageHeader section={group.label} title={item.label} description={item.summary} />
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-rule bg-surface px-6 py-16 text-center">
        <Hammer className="text-brass" size={28} strokeWidth={1.5} aria-hidden="true" />
        <p className="font-display text-xl font-bold">
          تُبنى هذه الصفحة في المرحلة {phase.number}: {phase.title}
        </p>
        <p className="max-w-md text-sm text-ink-muted">{phase.scope}</p>
      </div>
    </>
  );
}
