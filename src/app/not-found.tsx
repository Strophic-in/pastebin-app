import Link from "next/link";
import { FileQuestionIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <FileQuestionIcon className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Paste not found</h1>
        <p className="max-w-sm text-muted-foreground">
          This paste doesn&apos;t exist, has expired, or was burned after being
          read.
        </p>
        <Button asChild className="mt-2">
          <Link href="/">
            <PlusIcon /> Create a new paste
          </Link>
        </Button>
      </main>
    </div>
  );
}
