import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ReportProvider } from "@/lib/context/ReportContext";

export const metadata: Metadata = {
  title: "AstraMix AI",
  description: "Concrete mix strength prediction, cost/CO₂ estimation, and mix optimization.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ReportProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ReportProvider>
      </body>
    </html>
  );
}
