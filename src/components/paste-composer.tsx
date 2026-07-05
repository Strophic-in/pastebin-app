"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FlameIcon,
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  LockIcon,
  PlusIcon,
  ShieldCheckIcon,
  SendIcon,
  Share2Icon,
  TimerIcon,
  UploadIcon,
  XIcon,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  deriveKey,
  encryptString,
  generateKey,
  generateSalt,
} from "@/lib/crypto";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

type PasteType = "text" | "link" | "image";

const EXPIRATION_OPTIONS = [
  { value: "0", label: "Never" },
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "60", label: "1 hour" },
  { value: "1440", label: "1 day" },
  { value: "10080", label: "1 week" },
  { value: "43200", label: "30 days" },
];

export function PasteComposer() {
  const [type, setType] = useState<PasteType>("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; name: string; size: number } | null>(null);
  const [expiresIn, setExpiresIn] = useState("0");
  const [maxViews, setMaxViews] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdProtected, setCreatedProtected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const content = type === "text" ? text : type === "link" ? link : image?.dataUrl ?? "";
  const canSubmit = content.trim().length > 0 && !loading;

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large — max 3 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ dataUrl: reader.result as string, name: file.name, size: file.size });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (type === "link") {
      try {
        const url = new URL(link.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        toast.error("Please enter a valid http(s) URL");
        return;
      }
    }
    setLoading(true);
    try {
      // Encrypt in the browser — the server only ever sees ciphertext.
      const usePassword = password.trim().length > 0;
      let key: CryptoKey;
      let keyFragment = "";
      let salt: string | undefined;
      if (usePassword) {
        salt = generateSalt();
        key = await deriveKey(password, salt);
      } else {
        const generated = await generateKey();
        key = generated.key;
        keyFragment = `#k=${generated.exported}`;
      }
      const payload = await encryptString(
        type === "link" ? content.trim() : content,
        key
      );

      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: payload,
          encrypted: true,
          salt,
          title: title.trim() || undefined,
          type,
          expiresIn: expiresIn !== "0" ? expiresIn : undefined,
          maxViews: maxViews || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedUrl(`${window.location.origin}${data.url}${keyFragment}`);
        setCreatedProtected(usePassword);
        setPassword("");
        toast.success("Encrypted & created!");
      } else {
        toast.error(data.error || "Failed to create paste");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!createdUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Pastebin", url: createdUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      copyLink();
    }
  };

  const reset = () => {
    setCreatedUrl(null);
    setCreatedProtected(false);
    setTitle("");
    setText("");
    setLink("");
    setImage(null);
    setMaxViews("");
    setExpiresIn("0");
    setPassword("");
    setCopied(false);
  };

  if (createdUrl) {
    return (
      <Card className="mx-auto w-full max-w-lg text-center">
        <CardHeader className="items-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckIcon className="size-6" />
          </div>
          <CardTitle className="text-xl">Your paste is live!</CardTitle>
          <CardDescription>
            Anyone with this link can view it
            {expiresIn !== "0" && " until it expires"}
            {maxViews && ` (burns after ${maxViews} view${maxViews === "1" ? "" : "s"})`}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-left text-xs text-muted-foreground">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            {createdProtected ? (
              <span>
                <span className="font-medium text-foreground">
                  Encrypted with your password.
                </span>{" "}
                Viewers must enter it to decrypt — share the password
                separately. It can&apos;t be recovered if lost.
              </span>
            ) : (
              <span>
                <span className="font-medium text-foreground">
                  End-to-end encrypted.
                </span>{" "}
                The decryption key lives in the part of the link after{" "}
                <code className="font-mono">#</code> and never reaches our
                server — share the full link, and only its holders can read
                the paste.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2 pl-3">
            <span className="flex-1 truncate text-left font-mono text-sm">{createdUrl}</span>
            <Button size="sm" variant={copied ? "secondary" : "default"} onClick={copyLink}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={shareLink}>
              <Share2Icon /> Share
            </Button>
            <Button variant="outline" asChild>
              <Link href={createdUrl} target="_blank">
                <ExternalLinkIcon /> Open
              </Link>
            </Button>
            <Button variant="ghost" onClick={reset}>
              <PlusIcon /> Create another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-0">
        <Tabs value={type} onValueChange={(v) => setType(v as PasteType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileTextIcon /> Text
            </TabsTrigger>
            <TabsTrigger value="link">
              <LinkIcon /> Link
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon /> Image
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-2">
            <Label htmlFor="title">
              Title <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your paste a name…"
              maxLength={120}
            />
          </div>

          <TabsContent value="text" className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {text.length.toLocaleString()} chars
              </span>
            </div>
            <Textarea
              id="content"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleSubmit();
              }}
              placeholder="Paste your text or code here…  (Ctrl+Enter to submit)"
              className="h-72 resize-y font-mono text-sm"
            />
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-2">
            <Label htmlFor="link">URL</Label>
            <div className="relative">
              <LinkIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder="https://example.com/some/long/url"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Creates a short, shareable page for any http(s) URL.
            </p>
          </TabsContent>

          <TabsContent value="image" className="mt-4 space-y-2">
            <Label>Image</Label>
            {image ? (
              <div className="relative overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="mx-auto max-h-80 object-contain"
                />
                <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {image.name} · {(image.size / 1024).toFixed(0)} KB
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setImage(null)}>
                    <XIcon /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-muted-foreground transition-colors hover:border-ring hover:bg-accent/50 ${
                  dragging ? "border-ring bg-accent/50" : "border-input"
                }`}
              >
                <UploadIcon className="size-8" />
                <span className="font-medium text-foreground">
                  Click to upload or drag &amp; drop
                </span>
                <span className="text-xs">PNG, JPG, GIF, WebP or SVG — up to 3 MB</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="expiration">
              <TimerIcon className="size-3.5" /> Expiration
            </Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger id="expiration" className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxViews">
              <FlameIcon className="size-3.5" /> Burn after views
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="maxViews"
              type="number"
              min={1}
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              placeholder="e.g. 1 for one-time view"
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              <LockIcon className="size-3.5" /> Password
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Extra lock on top of E2E"
              autoComplete="new-password"
              className="bg-background"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheckIcon className="size-3.5 text-primary" />
            Encrypted in your browser before upload — we never see your
            content.
          </p>
          <Button size="lg" onClick={handleSubmit} disabled={!canSubmit} className="ml-auto">
            {loading ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
            {loading ? "Creating…" : "Create paste"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
