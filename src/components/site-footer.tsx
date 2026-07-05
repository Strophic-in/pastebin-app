export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          Built by{" "}
          <span className="font-semibold text-foreground">Strophic</span>
        </p>
        <p className="text-xs">Next.js · Prisma · Neon</p>
      </div>
    </footer>
  );
}
