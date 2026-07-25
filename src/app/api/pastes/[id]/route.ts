import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Fetched by the /p viewer after deriving the paste id from a code in the
// browser. Only ciphertext leaves here — decryption happens client-side.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const paste = await prisma.paste.findUnique({ where: { id } });
    if (!paste) {
      return NextResponse.json({ error: "Paste not found" }, { status: 404 });
    }

    const timeExpired =
      !!paste.expiresAt && paste.expiresAt.getTime() < Date.now();
    const viewsExceeded = !!(paste.maxViews && paste.views >= paste.maxViews);
    if (timeExpired || viewsExceeded) {
      return NextResponse.json(
        { error: "Paste unavailable", reason: viewsExceeded ? "burned" : "expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: paste.id,
      title: paste.title,
      type: paste.type,
      content: paste.content,
      encrypted: paste.encrypted,
      salt: paste.salt,
      createdAt: paste.createdAt.toISOString(),
      expiresAt: paste.expiresAt?.toISOString() ?? null,
      views: paste.views,
      maxViews: paste.maxViews,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load paste" }, { status: 500 });
  }
}
