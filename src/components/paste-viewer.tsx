"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  FlameIcon,
  KeyRoundIcon,
  Loader2Icon,
  LockIcon,
  LockOpenIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasteActions } from "@/components/paste-actions";
import { decryptString, deriveKey, importKey } from "@/lib/crypto";

interface PasteViewerProps {
  id: string;
  title: string | null;
  type: string;
  content: string;
  encrypted: boolean;
  salt: string | null;
}

export function PasteViewer({
  id,
  title,
  type,
  content,
  encrypted,
  salt,
}: PasteViewerProps) {
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [password, setPassword] = useState("");
  const [lastView, setLastView] = useState(false);
  const viewRecorded = useRef(false);

  const needsPassword = encrypted && !!salt;

  // Count the view only once the content was actually decrypted and shown —
  // page loads and wrong password attempts don't consume views.
  const recordView = useCallback(async () => {
    if (viewRecorded.current) return;
    viewRecorded.current = true;
    try {
      const res = await fetch(`/api/pastes/${id}/view`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.lastView) setLastView(true);
      }
    } catch {
      /* non-fatal — the content is already on screen */
    }
  }, [id]);

  useEffect(() => {
    if (!encrypted) {
      setDecrypted(content);
      recordView();
      return;
    }
    if (salt) return; // wait for the user's password

    const match = window.location.hash.match(/^#k=([A-Za-z0-9_-]+)/);
    if (!match) {
      setError(
        "The decryption key is missing from this link. Make sure you open the complete link, including everything after the # symbol."
      );
      return;
    }
    setDecrypting(true);
    (async () => {
      try {
        const key = await importKey(match[1]);
        setDecrypted(await decryptString(content, key));
        recordView();
      } catch {
        setError(
          "This link's decryption key is invalid or incomplete, so the paste can't be decrypted."
        );
      } finally {
        setDecrypting(false);
      }
    })();
  }, [encrypted, salt, content, recordView]);

  const unlock = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!password || !salt) return;
      setDecrypting(true);
      try {
        const key = await deriveKey(password, salt);
        setDecrypted(await decryptString(content, key));
        recordView();
        toast.success("Paste decrypted");
      } catch {
        toast.error("Incorrect password — please try again");
      } finally {
        setDecrypting(false);
      }
    },
    [password, salt, content, recordView]
  );

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Can&apos;t decrypt this paste</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (needsPassword && decrypted === null) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LockIcon className="size-6" />
          </div>
          <CardTitle>This paste is password-protected</CardTitle>
          <CardDescription>
            It was encrypted with a password — enter it to decrypt. Decryption
            happens entirely in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={unlock} className="flex gap-2">
            <div className="relative flex-1">
              <KeyRoundIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!password || decrypting}>
              {decrypting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <LockOpenIcon />
              )}
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (decrypted === null) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-10 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Decrypting in your browser…
      </div>
    );
  }

  const isValidImage = type === "image" && decrypted.startsWith("data:image/");
  const isValidLink =
    type === "link" && /^https?:\/\//i.test(decrypted.trim());

  return (
    <div className="space-y-3">
      {lastView && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <FlameIcon className="size-4 shrink-0" />
          This was the last available view — the paste is now burned and
          won&apos;t open again.
        </div>
      )}
      <div className="flex justify-end">
        <PasteActions id={id} title={title} type={type} content={decrypted} />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {type === "image" && isValidImage ? (
          <div className="flex items-center justify-center bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={decrypted}
              alt={title || "Shared image"}
              className="max-h-[70vh] max-w-full rounded-md object-contain"
            />
          </div>
        ) : type === "link" && isValidLink ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ExternalLinkIcon className="size-6" />
            </div>
            <p className="text-sm text-muted-foreground">This paste links to:</p>
            <p className="max-w-full break-all font-mono text-sm">
              {decrypted}
            </p>
            <Button asChild size="lg">
              <a href={decrypted} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon /> Open link
              </a>
            </Button>
          </div>
        ) : (
          <pre className="max-h-[70vh] overflow-auto p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">
            <code>{decrypted}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
