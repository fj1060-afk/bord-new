import Link from "next/link";
import { BrandSeal } from "@/components/shell/brand-seal";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <BrandSeal size={56} />
      <h1 className="font-display text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="text-ink-muted">تأكد من الرابط، أو ارجع إلى الصفحة الرئيسية.</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90"
      >
        الصفحة الرئيسية
      </Link>
    </main>
  );
}
