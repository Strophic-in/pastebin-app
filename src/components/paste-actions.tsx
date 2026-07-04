"use client";

import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  LinkIcon,
  Share2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface PasteActionsProps {
  id: string;
  title: string | null;
  type: string;
  content: string;
}

export function PasteActions({ id, title, type, content }: PasteActionsProps) {
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyContent = async () => {
    await navigator.clipboard.writeText(content);
    setCopiedContent(true);
    toast.success(type === "link" ? "URL copied" : "Content copied");
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const copyPageLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success("Page link copied");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || "Pastebin",
          url: window.location.href,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copyPageLink();
    }
  };

  const download = () => {
    const a = document.createElement("a");
    if (type === "image") {
      const ext = content.substring(
        content.indexOf("/") + 1,
        content.indexOf(";")
      );
      a.href = content;
      a.download = `${title || id}.${ext === "svg+xml" ? "svg" : ext}`;
    } else {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      a.href = URL.createObjectURL(blob);
      a.download = `${title || id}.txt`;
    }
    a.click();
    if (type !== "image") URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {type !== "image" && (
        <Button size="sm" variant="outline" onClick={copyContent}>
          {copiedContent ? <CheckIcon /> : <CopyIcon />}
          {type === "link" ? "Copy URL" : "Copy content"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={copyPageLink}>
        {copiedLink ? <CheckIcon /> : <LinkIcon />}
        Copy link
      </Button>
      <Button size="sm" variant="outline" onClick={share}>
        <Share2Icon />
        Share
      </Button>
      <Button size="sm" variant="outline" onClick={download}>
        <DownloadIcon />
        Download
      </Button>
    </div>
  );
}
