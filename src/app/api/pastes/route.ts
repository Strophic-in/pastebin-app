import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

const MAX_TEXT_LENGTH = 500_000; // ~500 KB of text
const MAX_IMAGE_DATA_URL_LENGTH = 4_200_000; // ~3 MB image as base64
const MAX_TITLE_LENGTH = 120;
const ALLOWED_IMAGE_MIMES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, title, type = "text", expiresIn, maxViews } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (!["text", "link", "image"].includes(type)) {
      return NextResponse.json({ error: "Invalid paste type" }, { status: 400 });
    }

    if (title && (typeof title !== "string" || title.length > MAX_TITLE_LENGTH)) {
      return NextResponse.json(
        { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (type === "text" && content.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Text is too large (max 500 KB)" },
        { status: 413 }
      );
    }

    if (type === "link" && !isValidHttpUrl(content.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid http(s) URL" },
        { status: 400 }
      );
    }

    if (type === "image") {
      const match = content.match(/^data:([a-z0-9/+.-]+);base64,/i);
      if (!match || !ALLOWED_IMAGE_MIMES.includes(match[1].toLowerCase())) {
        return NextResponse.json(
          { error: "Unsupported image format" },
          { status: 400 }
        );
      }
      if (content.length > MAX_IMAGE_DATA_URL_LENGTH) {
        return NextResponse.json(
          { error: "Image is too large (max 3 MB)" },
          { status: 413 }
        );
      }
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
        content: type === "link" ? content.trim() : content,
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
