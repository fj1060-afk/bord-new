import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { navItems } from "@/config/navigation";
import type { Viewer } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";
import { Today } from "./today";

export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const allowed = navItems.filter((item) => can(viewer.permissions, item.href)).map((item) => item.href);

  return (
    <div className="flex min-h-dvh">
      <Sidebar allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-rule bg-paper/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <MobileNav allowed={allowed} />
            <Today />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden max-w-48 truncate sm:inline">{viewer.fullName || viewer.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md p-2 text-ink-muted hover:bg-primary-soft hover:text-ink"
                aria-label="تسجيل الخروج"
                title="تسجيل الخروج"
              >
                <LogOut size={18} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
