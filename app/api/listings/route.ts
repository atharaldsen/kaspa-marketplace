import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const VALID_CATEGORIES = ["general", "digital-goods", "services", "electronics", "clothing", "collectibles"];
const VALID_PATTERNS = ["basic", "timelocked", "covenant_multi_path", "payment_split"];
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB base64
const MAX_PRICE_KAS = 1_000_000_000; // 1 billion KAS

// GET /api/listings — list active listings
export async function GET() {
  const listings = await prisma.listing.findMany({
    where: { status: "active" },
    include: { seller: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Convert BigInt to string for JSON serialization
  const serialized = listings.map((l) => ({
    ...l,
    price: l.price.toString(),
  }));

  return NextResponse.json(serialized);
}

// POST /api/listings — create a new listing
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, priceKas, category, imageData, escrowPattern, lockTimeDaa, feePercent, stages } = body;

  // Required fields
  if (!title || !description || !priceKas) {
    return NextResponse.json(
      { error: "Please fill in the title, description, and price." },
      { status: 400 }
    );
  }

  // Length validation
  if (typeof title !== "string" || title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `Title must be at most ${MAX_TITLE_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters` },
      { status: 400 }
    );
  }

  // Price validation
  const priceFloat = parseFloat(priceKas);
  if (isNaN(priceFloat) || priceFloat <= 0 || priceFloat > MAX_PRICE_KAS) {
    return NextResponse.json(
      { error: `Price must be between 0.01 and ${MAX_PRICE_KAS.toLocaleString()} KAS.` },
      { status: 400 }
    );
  }

  // Image size validation
  if (imageData && (typeof imageData !== "string" || imageData.length > MAX_IMAGE_SIZE)) {
    return NextResponse.json(
      { error: "Image data exceeds 5 MB limit" },
      { status: 400 }
    );
  }

  // Enum validation
  const validCategory = VALID_CATEGORIES.includes(category) ? category : "general";
  const validPattern = VALID_PATTERNS.includes(escrowPattern) ? escrowPattern : "basic";

  // Range validation for optional fields
  let validLockTimeDaa: number | null = null;
  if (lockTimeDaa) {
    const parsed = parseInt(lockTimeDaa);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100_000_000) {
      validLockTimeDaa = parsed;
    }
  }

  let validFeePercent: number | null = null;
  if (feePercent) {
    const parsed = parseInt(feePercent);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 99) {
      validFeePercent = parsed;
    }
  }

  // Convert KAS to sompi (1 KAS = 100_000_000 sompi)
  const priceSompi = BigInt(Math.round(priceFloat * 100_000_000));

  const listing = await prisma.listing.create({
    data: {
      sellerId: session.user.id,
      title: title.trim(),
      description: description.trim(),
      price: priceSompi,
      category: validCategory,
      imageData: imageData || null,
      escrowPattern: validPattern,
      lockTimeDaa: validLockTimeDaa,
      feePercent: validFeePercent,
      stages: stages ? JSON.stringify(stages) : null,
    },
    include: { seller: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(
    { ...listing, price: listing.price.toString() },
    { status: 201 }
  );
}
