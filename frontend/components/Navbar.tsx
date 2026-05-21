"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "./ui/button";

export default function Navbar() {
  const pathname = usePathname();
  const isAppPage = pathname === "/app";

  return (
    <nav className="fixed inset-x-0 top-4 z-50">
      <div className="mx-auto flex w-full max-w-6xl px-4">
        <div
          className={`flex h-14 w-full items-center rounded-full border border-white/10 px-6 ${
            isAppPage
              ? "justify-start bg-transparent backdrop-blur-0"
              : "justify-between bg-[rgba(var(--color-brand-rgb),0.85)] backdrop-blur-[24px]"
          }`}
        >
          <Link href="/" className="font-display text-lg font-semibold">
            <span className="text-white">B</span>
            <span className="text-[var(--color-accent)]">riefr</span>
          </Link>
          {!isAppPage && (
            <div className="flex items-center gap-4">
              <Button asChild size="sm" variant="primary">
                <Link href="/app">Start →</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
