import {
  FlameIcon,
  KeyRoundIcon,
  LockIcon,
  SendIcon,
  Share2Icon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { PasteComposer } from "@/components/paste-composer";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "End-to-end encrypted",
    desc: "AES-256 encryption happens in your browser — the server only ever stores ciphertext it can't read.",
  },
  {
    icon: LockIcon,
    title: "Password protection",
    desc: "Optionally lock a paste with a password only you and your recipient know.",
  },
  {
    icon: FlameIcon,
    title: "Self-destructing",
    desc: "Expire links after minutes, hours or days — or burn them after N views.",
  },
  {
    icon: Share2Icon,
    title: "Share anything",
    desc: "Text, code, links and images — one short URL, no account needed.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: SendIcon,
    title: "1. Write or upload",
    desc: "Paste text or code, drop in a link, or upload an image. Add an optional title, expiry time, view limit or password.",
  },
  {
    icon: KeyRoundIcon,
    title: "2. Encrypted in your browser",
    desc: "Your content is encrypted with AES-256 before it leaves your device. The decryption key stays in the link fragment or your password — it never reaches the server.",
  },
  {
    icon: Share2Icon,
    title: "3. Share the link",
    desc: "Send the short link to anyone. Only people with the full link — or the password — can decrypt and read the paste.",
  },
];

const FAQS = [
  {
    q: "Is this pastebin really private?",
    a: "Yes. Every paste is encrypted with AES-256-GCM in your browser before upload, so the server and database only ever store unreadable ciphertext. The decryption key travels in the link fragment (the part after #), which browsers never send to servers — meaning not even the site operator can read your pastes.",
  },
  {
    q: "Do I need an account to share a paste?",
    a: "No. There is no sign-up, no login and no tracking. Open the site, paste your content, and share the generated link.",
  },
  {
    q: "What can I share?",
    a: "Plain text and code snippets up to about 500 KB, any http(s) link, and images (PNG, JPG, GIF, WebP or SVG) up to 3 MB — all end-to-end encrypted.",
  },
  {
    q: "How does password protection work?",
    a: "When you set a password, the encryption key is derived from it using PBKDF2 with 210,000 iterations. Viewers must enter the same password to decrypt the paste in their browser. The password is never sent to the server and cannot be recovered if lost.",
  },
  {
    q: "How long are pastes stored?",
    a: "You choose: pastes can live forever, expire after a set time from 5 minutes to 30 days, or burn after a chosen number of views. A view only counts when someone actually decrypts the paste — not when the page merely loads.",
  },
  {
    q: "What happens when a paste expires or burns?",
    a: "Once a paste passes its expiry time or reaches its view limit, it can no longer be opened. Visitors see an expired/burned notice instead of the content.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "End-to-end AES-256 encryption",
        "Password-protected pastes",
        "Expiring links (5 minutes to 30 days)",
        "Burn after reading (view limits)",
        "Share text, code, links and images",
        "No account required",
      ],
      creator: {
        "@type": "Organization",
        name: "Strophic",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.a,
        },
      })),
    },
  ],
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-16 sm:px-6">
        <section className="bg-grid relative -mx-4 overflow-hidden px-4 pt-12 pb-8 text-center sm:-mx-6 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 h-56 w-[28rem] max-w-full -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20"
          />
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <SparklesIcon className="size-3.5 text-primary" />
            Free · End-to-end encrypted · No sign-up
          </span>
          <h1 className="mt-4 bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Encrypted pastebin — share anything, instantly
          </h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Paste text, drop a link or upload an image — it&apos;s encrypted in
            your browser before it ever leaves, and only people you share the
            link (or password) with can read it.
          </p>
        </section>

        <PasteComposer />

        <section aria-labelledby="features-heading" className="mt-10">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-4">
                <f.icon aria-hidden className="mb-2 size-5 text-primary" />
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-heading" className="mt-14">
          <h2
            id="how-heading"
            className="text-center text-xl font-bold tracking-tight sm:text-2xl"
          >
            How it works
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.title} className="rounded-xl border bg-card p-5">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon aria-hidden className="size-4.5" />
                </div>
                <h3 className="text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="mt-14">
          <h2
            id="faq-heading"
            className="text-center text-xl font-bold tracking-tight sm:text-2xl"
          >
            Frequently asked questions
          </h2>
          <div className="mx-auto mt-6 max-w-2xl space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border bg-card px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
