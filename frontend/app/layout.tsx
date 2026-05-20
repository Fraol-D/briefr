import type { ReactNode } from "react";
import { Inter, Manrope, Work_Sans } from "next/font/google";

import "./globals.css";
import Navbar from "../components/Navbar";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Briefr",
  description: "Research anything. Get answers in seconds."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${workSans.variable} ${inter.variable}`}
    >
      <body className="bg-[var(--color-dark-surface)] font-body text-white antialiased">
        <Navbar />
        <div className="pt-24">{children}</div>
      </body>
    </html>
  );
}
