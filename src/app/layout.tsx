import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";
import { SmoothDetails } from "@/components/ui/smooth-details";
import "./globals.css";

const body = IBM_Plex_Sans_Arabic({
  variable: "--font-body",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["500", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-latin",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: { default: "مجلس", template: "%s · مجلس" },
  description: "منصة حوكمة مجالس الإدارة واللجان",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${body.variable} ${naskh.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <SmoothDetails />
      </body>
    </html>
  );
}
