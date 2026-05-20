import Link from "next/link";

import { Button } from "./ui/button";

export default function Navbar() {
  return (
    <nav className="fixed inset-x-0 top-4 z-50">
      <div className="mx-auto flex w-full max-w-6xl px-4">
        <div className="flex h-14 w-full items-center justify-between rounded-full border border-white/10 bg-[rgba(var(--color-brand-rgb),0.85)] px-6 backdrop-blur-[24px]">
          <Link href="/" className="font-display text-lg font-semibold">
            <span className="text-white">B</span>
            <span className="text-[var(--color-accent)]">riefr</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button asChild size="sm" variant="primary">
              <Link href="/app">Start →</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
