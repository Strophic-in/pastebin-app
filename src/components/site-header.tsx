import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ showNewPaste = false }: { showNewPaste?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Image
            src="/logo.svg"
            alt="Pastebin logo"
            width={28}
            height={28}
            className="size-7"
            priority
          />
          Pastebin
        </Link>
        <div className="flex items-center gap-1.5">
          {showNewPaste && (
            <Button asChild size="sm" variant="secondary">
              <Link href="/">
                <PlusIcon /> New paste
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
