import { cache } from "react";
import type { Metadata } from "next";
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
  LockIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PasteViewer } from "@/components/paste-viewer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Deduped across generateMetadata and the page render
const getPaste = cache(async (id: string) =>
  prisma.paste.findUnique({ where: { id } })
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const paste = await getPaste(id).catch(() => null);
  return {
    title: paste?.title || "Encrypted paste",
    description:
      "An end-to-end encrypted paste. Only people with the full link or password can read it.",
    // User content — never index paste pages
    robots: { index: false, follow: false },
  };
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
      <SiteFooter />
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

  // Views are recorded by the client only after a successful decryption
  // (see /api/pastes/[id]/view), so serving this page doesn't burn a view.
  const paste = await getPaste(id);
  if (!paste) notFound();

  const timeExpired = isTimeExpired(paste.expiresAt);
  const viewsExceeded = !!(paste.maxViews && paste.views >= paste.maxViews);

  if (timeExpired || viewsExceeded) {
    return <ExpiredScreen viewsExceeded={viewsExceeded} />;
  }

  const meta = TYPE_META[paste.type as keyof typeof TYPE_META] ?? TYPE_META.text;
  const TypeIcon = meta.icon;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader showNewPaste />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-4 min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
            {paste.title || `Untitled ${meta.label.toLowerCase()} paste`}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              <TypeIcon /> {meta.label}
            </Badge>
            {paste.encrypted && (
              <Badge variant="secondary">
                {paste.salt ? <LockIcon /> : <ShieldCheckIcon />}
                {paste.salt ? "Password-protected" : "E2E encrypted"}
              </Badge>
            )}
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

        <PasteViewer
          id={paste.id}
          title={paste.title}
          type={paste.type}
          content={paste.content}
          encrypted={paste.encrypted}
          salt={paste.salt}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
