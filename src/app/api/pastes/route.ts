import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

// Content arrives as an AES-GCM ciphertext payload (encrypted in the browser),
// so the server can only enforce size limits — it never sees the plaintext.
const MAX_TEXT_PAYLOAD = 1_500_000; // ~1 MB of encrypted text
const MAX_IMAGE_PAYLOAD = 6_500_000; // ~3 MB image after base64 + encryption
const MAX_TITLE_LENGTH = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, title, type = "text", expiresIn, maxViews, encrypted, salt } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!["text", "link", "image"].includes(type)) {
      return NextResponse.json({ error: "Invalid paste type" }, { status: 400 });
    }

    if (encrypted !== true) {
      return NextResponse.json(
        { error: "Pastes must be encrypted client-side" },
        { status: 400 }
      );
    }

    if (salt !== undefined && (typeof salt !== "string" || salt.length > 64)) {
      return NextResponse.json({ error: "Invalid salt" }, { status: 400 });
    }

    if (title && (typeof title !== "string" || title.length > MAX_TITLE_LENGTH)) {
      return NextResponse.json(
        { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      );
    }

    const maxPayload = type === "image" ? MAX_IMAGE_PAYLOAD : MAX_TEXT_PAYLOAD;
    if (content.length > maxPayload) {
      return NextResponse.json(
        { error: type === "image" ? "Image is too large (max 3 MB)" : "Text is too large (max 1 MB)" },
        { status: 413 }
      );
    }

    // Sanity-check the ciphertext envelope shape
    try {
      const payload = JSON.parse(content);
      if (typeof payload?.iv !== "string" || typeof payload?.ct !== "string") {
        throw new Error("bad envelope");
      }
    } catch {
      return NextResponse.json(
        { error: "Malformed encrypted payload" },
        { status: 400 }
      );
    }

    let expiresAt: Date | null = null;
    if (expiresIn) {
      const minutes = parseInt(expiresIn, 10);
      if (!isNaN(minutes) && minutes > 0) {
        expiresAt = new Date(Date.now() + minutes * 60 * 1000);
      }
    }

    let parsedMaxViews: number | null = null;
    if (maxViews) {
      const views = parseInt(maxViews, 10);
      if (isNaN(views) || views < 1) {
        return NextResponse.json(
          { error: "Burn-after-views must be a positive number" },
          { status: 400 }
        );
      }
      parsedMaxViews = views;
    }

    const paste = await prisma.paste.create({
      data: {
        id: nanoid(8),
        title: title?.trim() || null,
        type,
        content,
        encrypted: true,
        salt: salt || null,
        expiresAt,
        maxViews: parsedMaxViews,
      },
    });

    return NextResponse.json({
      id: paste.id,
      url: `/paste/${paste.id}`,
    });
  } catch (error) {
    console.error("API Error creating paste:", error);
    return NextResponse.json(
      { error: "Failed to create paste" },
      { status: 500 }
    );
  }
}
