import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createEscrow } from "@/lib/escrow-api";

interface Stage {
  name: string;
  priceSompi: string;
}

function safeParseStages(raw: string): Stage[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// POST /api/listings/[id]/buy — create escrow(s) for a listing
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Use a transaction to prevent race conditions: re-check inside transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({
        where: { id },
        include: { escrows: true },
      });

      if (!listing) throw new Error("NOT_FOUND:Listing not found");
      if (listing.status !== "active") throw new Error("BAD_REQUEST:Listing is no longer active");
      if (listing.sellerId === session.user!.id) throw new Error("BAD_REQUEST:Cannot buy your own listing");

      // Check for existing active escrow (inside transaction)
      const activeEscrow = listing.escrows.find(
        (e) => !["released", "refunded", "disputed"].includes(e.status)
      );
      if (activeEscrow) throw new Error("BAD_REQUEST:An escrow is already in progress");

      // Mark listing so concurrent requests are blocked
      await tx.listing.update({
        where: { id },
        data: { status: "sold" },
      });

      const stages = listing.stages ? safeParseStages(listing.stages) : null;

      if (stages && stages.length > 1) {
        // Staged payments: create all escrows via Rust API first, then batch insert
        const apiResults = [];
        for (const stage of stages) {
          const amount = Number(stage.priceSompi);
          if (isNaN(amount) || amount <= 0) {
            throw new Error("BAD_REQUEST:Invalid stage price");
          }
          const escrowResult = await createEscrow({
            pattern: listing.escrowPattern,
            amount,
            lock_time: listing.lockTimeDaa ?? undefined,
            fee_percent: listing.feePercent ?? undefined,
          });
          apiResults.push(escrowResult);
        }

        // All API calls succeeded — now batch create DB records
        const escrows = [];
        for (let i = 0; i < apiResults.length; i++) {
          const escrowResult = apiResults[i];
          const escrow = await tx.escrow.create({
            data: {
              listingId: listing.id,
              buyerId: session.user!.id!,
              escrowApiId: escrowResult.id,
              stageIndex: i,
              fundingAddress: escrowResult.funding_address,
              escrowAmount: BigInt(escrowResult.escrow_amount),
              status: i === 0 ? "awaiting_funding" : "pending_stage",
            },
          });
          escrows.push(escrow);
        }

        return {
          id: escrows[0].id,
          escrowApiId: escrows[0].escrowApiId,
          fundingAddress: escrows[0].fundingAddress,
          escrowAmount: escrows[0].escrowAmount.toString(),
          status: escrows[0].status,
          totalStages: stages.length,
        };
      } else {
        // Single escrow
        const escrowResult = await createEscrow({
          pattern: listing.escrowPattern,
          amount: Number(listing.price),
          lock_time: listing.lockTimeDaa ?? undefined,
          fee_percent: listing.feePercent ?? undefined,
        });

        const escrow = await tx.escrow.create({
          data: {
            listingId: listing.id,
            buyerId: session.user!.id!,
            escrowApiId: escrowResult.id,
            stageIndex: 0,
            fundingAddress: escrowResult.funding_address,
            escrowAmount: BigInt(escrowResult.escrow_amount),
            status: "awaiting_funding",
          },
        });

        return {
          id: escrow.id,
          escrowApiId: escrow.escrowApiId,
          fundingAddress: escrow.fundingAddress,
          escrowAmount: escrow.escrowAmount.toString(),
          status: escrow.status,
        };
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";

    // Structured error codes
    if (message.startsWith("NOT_FOUND:")) {
      return NextResponse.json({ error: message.slice(10) }, { status: 404 });
    }
    if (message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json({ error: message.slice(12) }, { status: 400 });
    }

    // Don't leak internal error details
    console.error("Buy route error:", err);
    return NextResponse.json({ error: "Unable to set up escrow. Please try again." }, { status: 500 });
  }
}
