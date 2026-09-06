import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ReportProvider } from "@/lib/context/ReportContext";

export const metadata: Metadata = {
  title: "AstraMix AI | Concrete Mix Optimization",
  description:
    "AstraMix AI uses computational optimization to analyze concrete strength, cost, material composition, and carbon footprint.",
  keywords:
    "AstraMix AI, concrete mix optimization, sustainable concrete, civil engineering AI, compressive strength prediction, embodied carbon reduction, material science",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-sans">
        <ReportProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ReportProvider>
      </body>
    </html>
  );
}
