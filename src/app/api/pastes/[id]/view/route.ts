import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Called by the client after a successful in-browser decryption, so views
// count actual reads — not page loads or failed password attempts.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const paste = await prisma.paste.update({
      where: { id },
      data: { views: { increment: 1 } },
      select: { views: true, maxViews: true },
    });
    return NextResponse.json({
      views: paste.views,
      maxViews: paste.maxViews,
      lastView: !!(paste.maxViews && paste.views >= paste.maxViews),
    });
  } catch {
    return NextResponse.json({ error: "Paste not found" }, { status: 404 });
  }
}
