import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  FlameIcon,
  ImageIcon,
  LinkIcon,
  TimerIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PasteActions } from "@/components/paste-actions";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

const TYPE_META = {
  text: { icon: FileTextIcon, label: "Text" },
  link: { icon: LinkIcon, label: "Link" },
  image: { icon: ImageIcon, label: "Image" },
} as const;

function ExpiredScreen({ viewsExceeded }: { viewsExceeded: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          {viewsExceeded ? (
            <FlameIcon className="size-7" />
          ) : (
            <TimerIcon className="size-7" />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {viewsExceeded ? "This paste has burned" : "This paste has expired"}
        </h1>
        <p className="max-w-sm text-muted-foreground">
          {viewsExceeded
            ? "It reached its maximum view count and is no longer available."
            : "Its expiration time has passed and it is no longer available."}
        </p>
        <Button asChild className="mt-2">
          <Link href="/">Create a new paste</Link>
        </Button>
      </main>
    </div>
  );
}

function isTimeExpired(expiresAt: Date | null) {
  return !!expiresAt && expiresAt.getTime() < Date.now();
}

function formatRemaining(expiresAt: Date) {
  const ms = expiresAt.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} d`;
}

export default async function PastePage({ params }: PageProps) {
  const { id } = await params;

  let paste;
  try {
    paste = await prisma.paste.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  } catch {
    notFound();
  }

  const timeExpired = isTimeExpired(paste.expiresAt);
  const viewsExceeded = !!(paste.maxViews && paste.views > paste.maxViews);

  if (timeExpired || viewsExceeded) {
    return <ExpiredScreen viewsExceeded={viewsExceeded} />;
  }

  const meta = TYPE_META[paste.type as keyof typeof TYPE_META] ?? TYPE_META.text;
  const TypeIcon = meta.icon;
  const lastView = !!(paste.maxViews && paste.views >= paste.maxViews);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader showNewPaste />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
              {paste.title || `Untitled ${meta.label.toLowerCase()} paste`}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                <TypeIcon /> {meta.label}
              </Badge>
              <span className="flex items-center gap-1">
                <CalendarIcon className="size-3.5" />
                {paste.createdAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <EyeIcon className="size-3.5" />
                {paste.views}
                {paste.maxViews ? ` / ${paste.maxViews}` : ""} views
              </span>
              {paste.expiresAt && (
                <span className="flex items-center gap-1">
                  <TimerIcon className="size-3.5" />
                  Expires {formatRemaining(paste.expiresAt)}
                </span>
              )}
            </div>
          </div>
          <PasteActions
            id={paste.id}
            title={paste.title}
            type={paste.type}
            content={paste.content}
          />
        </div>

        {lastView && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <FlameIcon className="size-4 shrink-0" />
            This was the last available view — the paste is now burned and
            won&apos;t open again.
          </div>
        )}

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {paste.type === "image" ? (
            <div className="flex items-center justify-center bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paste.content}
                alt={paste.title || "Shared image"}
                className="max-h-[70vh] max-w-full rounded-md object-contain"
              />
            </div>
          ) : paste.type === "link" ? (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LinkIcon className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                This paste links to:
              </p>
              <p className="max-w-full break-all font-mono text-sm">
                {paste.content}
              </p>
              <Button asChild size="lg">
                <a href={paste.content} target="_blank" rel="noopener noreferrer">
                  <LinkIcon /> Open link
                </a>
              </Button>
            </div>
          ) : (
            <pre className="max-h-[70vh] overflow-auto p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
              <code>{paste.content}</code>
            </pre>
          )}
        </div>
      </main>
    </div>
  );
}
