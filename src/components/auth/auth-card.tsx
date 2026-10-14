import type { ReactNode } from "react";
import { BrandSeal } from "@/components/shell/brand-seal";

export function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sidebar px-4 py-12">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandSeal size={52} />
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          {description && <p className="text-sm text-ink-muted">{description}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
