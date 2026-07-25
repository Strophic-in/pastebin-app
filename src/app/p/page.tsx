import type { Metadata } from "next";

import { PasteCodeViewer } from "@/components/paste-code-viewer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "View a paste",
  description:
    "Enter a paste code to locate and decrypt an end-to-end encrypted paste in your browser.",
  // User content — never index viewer pages
  robots: { index: false, follow: false },
};

// The code lives in the URL fragment (never sent to the server), so this page
// is a shell — everything happens client-side.
export default function ViewByCodePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader showNewPaste />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <PasteCodeViewer />
      </main>
      <SiteFooter />
    </div>
  );
}
