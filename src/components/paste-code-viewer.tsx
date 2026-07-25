"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  EyeIcon,
  FileTextIcon,
  FlameIcon,
  ImageIcon,
  KeyRoundIcon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  SearchIcon,
  ShieldCheckIcon,
  TimerIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasteViewer } from "@/components/paste-viewer";
import { CODE_PATTERN, deriveFromCode, normalizeCode } from "@/lib/crypto";

interface PasteData {
  id: string;
  title: string | null;
  type: string;
  content: string;
  encrypted: boolean;
  salt: string | null;
  createdAt: string;
  expiresAt: string | null;
  views: number;
  maxViews: number | null;
}

const TYPE_META = {
  text: { icon: FileTextIcon, label: "Text" },
  link: { icon: LinkIcon, label: "Link" },
  image: { icon: ImageIcon, label: "Image" },
} as const;

function formatRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  return `in ${Math.round(hours / 24)} d`;
}

type Status =
  | { state: "enter" }
  | { state: "loading" }
  | { state: "not-found" }
  | { state: "gone"; reason: "expired" | "burned" }
  | { state: "failed" }
  | { state: "ready"; paste: PasteData; key: CryptoKey };

export function PasteCodeViewer() {
  const [status, setStatus] = useState<Status>({ state: "enter" });
  const [codeInput, setCodeInput] = useState("");

  const load = useCallback(async (code: string) => {
    setStatus({ state: "loading" });
    try {
      const { id, key } = await deriveFromCode(code);
      const res = await fetch(`/api/pastes/${id}`);
      if (res.status === 404) {
        // Show the failed code in the form so typos are easy to spot and fix.
        setCodeInput(code);
        setStatus({ state: "not-found" });
        return;
      }
      if (res.status === 410) {
        const data = await res.json().catch(() => null);
        setStatus({
          state: "gone",
          reason: data?.reason === "burned" ? "burned" : "expired",
        });
        return;
      }
      if (!res.ok) {
        setStatus({ state: "failed" });
        return;
      }
      const paste = (await res.json()) as PasteData;
      setStatus({ state: "ready", paste, key });
    } catch {
      setStatus({ state: "failed" });
    }
  }, []);

  // A code arriving in the fragment (share links: /p#<code>) is auto-opened.
  useEffect(() => {
    const code = normalizeCode(window.location.hash.slice(1));
    if (!CODE_PATTERN.test(code)) return;
    // Deferred so state updates don't run synchronously inside the effect.
    const timer = setTimeout(() => load(code), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = normalizeCode(codeInput);
    if (!CODE_PATTERN.test(code)) return;
    // Keep the code in the fragment so reload/share of this page still works —
    // fragments never reach the server.
    window.history.replaceState(null, "", `#${code}`);
    load(code);
  };

  if (status.state === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-10 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Locating &amp; decrypting in your browser…
      </div>
    );
  }

  if (status.state === "gone") {
    const burned = status.reason === "burned";
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          {burned ? <FlameIcon className="size-7" /> : <TimerIcon className="size-7" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {burned ? "This paste has burned" : "This paste has expired"}
        </h1>
        <p className="max-w-sm text-muted-foreground">
          {burned
            ? "It reached its maximum view count and is no longer available."
            : "Its expiration time has passed and it is no longer available."}
        </p>
        <Button asChild className="mt-2">
          <Link href="/">Create a new paste</Link>
        </Button>
      </div>
    );
  }

  if (status.state === "ready") {
    const { paste, key } = status;
    const meta = TYPE_META[paste.type as keyof typeof TYPE_META] ?? TYPE_META.text;
    const TypeIcon = meta.icon;
    return (
      <>
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
              {new Date(paste.createdAt).toLocaleDateString("en-US", {
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
          decryptKey={key}
        />
      </>
    );
  }

  // "enter", "not-found" and "failed" all show the code form.
  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader className="items-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRoundIcon className="size-6" />
        </div>
        <CardTitle>View a paste</CardTitle>
        <CardDescription>
          Enter the 10-character code you were given. It locates the paste and
          decrypts it right in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.state === "not-found" && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            No paste found for that code — check it for typos.
          </p>
        )}
        {status.state === "failed" && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Something went wrong — please try again.
          </p>
        )}
        <form onSubmit={submit} className="flex gap-2">
          <Input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="e.g. Ab3xK9mQ2f"
            className="text-center font-mono tracking-widest"
            autoFocus
            maxLength={200}
          />
          <Button
            type="submit"
            disabled={!CODE_PATTERN.test(normalizeCode(codeInput))}
          >
            <SearchIcon /> View
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
