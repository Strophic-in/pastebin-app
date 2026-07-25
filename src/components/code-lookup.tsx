"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CODE_PATTERN, normalizeCode } from "@/lib/crypto";

export function CodeLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const normalized = normalizeCode(code);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (CODE_PATTERN.test(normalized)) router.push(`/p#${normalized}`);
      }}
      className="mx-auto mt-5 flex w-full max-w-xs items-center gap-2"
    >
      <div className="relative flex-1">
        <KeyRoundIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Have a code? Enter it"
          className="bg-card pl-9 text-center font-mono"
          maxLength={200}
        />
      </div>
      <Button type="submit" variant="outline" disabled={!CODE_PATTERN.test(normalized)}>
        View
      </Button>
    </form>
  );
}
